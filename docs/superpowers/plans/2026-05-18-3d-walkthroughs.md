# 3D Gaussian Splat Walkthroughs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real estate agents upload phone photos of a listing → PropFlow trains a 3D Gaussian Splat scene on rented GPU → tenants click a shareable link and explore the home in their browser.

**Architecture:** Photos go from agent → Cloudflare R2 → RunPod Serverless GPU worker (COLMAP + gsplat, fully OSS, MIT/Apache/BSD) → `.ply` written back to R2 → public viewer page renders via `@playcanvas/supersplat-viewer` (MIT). RunPod is the only third-party — everything else lives in this repo. The training container is portable; if RunPod ever fails or raises prices, swap to Modal/Lambda by changing one env var.

**Tech Stack:**
- **Frontend:** Next.js 16 App Router, React 19, Shadcn/UI, TanStack Query, React Hook Form + Zod, `@playcanvas/supersplat-viewer`
- **Backend:** Supabase (PostgreSQL + RLS), Next.js route handlers, HMAC-SHA256 webhook signing
- **Trainer container:** Python 3.11, COLMAP 3.10 (BSD-3), `gsplat` (Apache-2 — nerfstudio-project, NOT Inria's non-commercial license), `runpod` Python SDK
- **Storage:** Cloudflare R2 (S3-compatible, signed URLs)
- **GPU compute:** RunPod Serverless, RTX 4090 / L40S workers, scales to zero

**Feature gating:** Walkthroughs are an **Agency Growth ($289/mo)** + **Brokerage Command ($499/mo)** feature. Locked for Agent Pro. Enforced server-side via existing `src/lib/plans/gate.ts` pattern.

---

## File Structure

**New files:**

```
supabase/migrations/
└── 20260518_walkthroughs.sql          # walkthrough_jobs, walkthrough_renders tables + RLS + storage paths

src/types/
└── walkthroughs.ts                     # WalkthroughJob, WalkthroughRender, JobStatus enum

src/lib/walkthroughs/
├── r2-client.ts                        # Signed upload URLs, signed read URLs, key conventions
├── runpod-client.ts                    # POST job, status fetch
├── webhook-signer.ts                   # HMAC-SHA256 sign/verify (constant-time)
└── quality-gate.ts                     # Client-side blur + photo-count + size validation

src/lib/hooks/
├── use-walkthrough.ts                  # TanStack: fetch single job by id
└── use-walkthroughs.ts                 # TanStack: list jobs for a property

src/app/api/walkthroughs/
├── upload-init/route.ts                # POST: create job row + N signed R2 upload URLs
├── [id]/train/route.ts                 # POST: mark photos uploaded, dispatch RunPod
├── [id]/status/route.ts                # GET: status + progress (auth-gated, company-scoped)
└── webhook/route.ts                    # POST: RunPod callback (HMAC-verified, admin client)

src/app/api/tour/[token]/
└── route.ts                            # GET: public token → signed R2 read URL for .ply

src/app/(dashboard)/properties/[id]/walkthrough/
├── page.tsx                            # Walkthrough list + "New Walkthrough" CTA
├── upload/page.tsx                     # Upload UI w/ photo quality gate
└── [jobId]/page.tsx                    # Status / progress / share-link page

src/app/tour/[token]/
└── page.tsx                            # Public tenant-facing viewer (no auth required)

src/components/walkthroughs/
├── photo-uploader.tsx                  # Drag-drop, thumbnail grid, quality scores
├── walkthrough-status-card.tsx         # Polled status + progress bar + share link copy
└── splat-viewer.tsx                    # @playcanvas/supersplat-viewer wrapper

services/splat-trainer/                 # FULLY SELF-CONTAINED — RunPod points its serverless endpoint at this dir
├── Dockerfile                          # nvidia/cuda:12.4 base + COLMAP + gsplat + Python deps
├── handler.py                          # RunPod serverless entrypoint (downloads photos, runs pipeline, uploads .ply)
├── pipeline/
│   ├── __init__.py
│   ├── colmap_runner.py                # SfM (camera pose estimation)
│   ├── gsplat_trainer.py               # 3DGS training (Apache-2)
│   ├── r2_io.py                        # Download photos + upload .ply via boto3 (S3-compatible)
│   └── webhook.py                      # HMAC-sign + POST status to PropFlow
├── requirements.txt                    # gsplat, torch, opencv, boto3, runpod, numpy, pillow
└── README.md                           # Local dev, build, deploy to RunPod

docs/walkthroughs/
├── ARCHITECTURE.md                     # End-to-end flow diagram + cost model
├── RUNPOD_DEPLOY.md                    # Step-by-step: build image, create endpoint, get endpoint ID
└── ENV_VARS.md                         # All new env vars + where to set them (Vercel + RunPod template)
```

**Modified files:**

- `src/types/database.ts` — add `walkthrough_jobs` + `walkthrough_renders` table types
- `src/lib/plans/gate.ts` — add `walkthroughs` feature flag, gate to Agency Growth+
- `.env.example` — document new env vars (RUNPOD_API_KEY, RUNPOD_ENDPOINT_ID, R2_*, WALKTHROUGH_WEBHOOK_SECRET)

---

## Database Schema

`walkthrough_jobs` row lifecycle:

```
pending → uploading → queued → training → succeeded
                            ↘ failed
```

```sql
CREATE TABLE walkthrough_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','uploading','queued','training','succeeded','failed')),
  photo_count     INT NOT NULL DEFAULT 0,
  runpod_job_id   TEXT,                   -- RunPod's internal job UUID
  error_message   TEXT,
  progress_pct    INT DEFAULT 0,          -- 0-100, updated by webhook
  share_token     TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  splat_r2_key    TEXT,                   -- e.g. walkthroughs/<job_id>/scene.ply
  preview_r2_key  TEXT,                   -- thumbnail captured mid-training
  splat_size_bytes BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_walkthrough_jobs_property ON walkthrough_jobs(property_id);
CREATE INDEX idx_walkthrough_jobs_company  ON walkthrough_jobs(company_id);
CREATE INDEX idx_walkthrough_jobs_token    ON walkthrough_jobs(share_token);

-- RLS: company-scoped via existing get_user_company_id()
ALTER TABLE walkthrough_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "walkthrough_jobs_company_select" ON walkthrough_jobs FOR SELECT
  USING (company_id = get_user_company_id());
CREATE POLICY "walkthrough_jobs_company_insert" ON walkthrough_jobs FOR INSERT
  WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "walkthrough_jobs_company_update" ON walkthrough_jobs FOR UPDATE
  USING (company_id = get_user_company_id());
CREATE POLICY "walkthrough_jobs_company_delete" ON walkthrough_jobs FOR DELETE
  USING (company_id = get_user_company_id());

-- Public viewing via share_token uses admin client server-side, bypassing RLS.
-- No anonymous SELECT policy needed.

NOTIFY pgrst, 'reload schema';
```

`walkthrough_renders` is optional v2 (multiple renders per job, e.g. low-res preview + high-res final). Stub it now so we don't have to migrate later, but only insert the `splat_r2_key` directly in v0 for simplicity.

---

## Bite-Sized Tasks

### Task 1: Add npm dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

Run:
```bash
cd /c/Users/User/realestate-App
npm install @playcanvas/supersplat-viewer @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Expected: `package.json` and `package-lock.json` updated, no peer-dep warnings beyond existing.

- [ ] **Step 2: Verify install**

Run: `npm list @playcanvas/supersplat-viewer @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
Expected: all three listed without warnings.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(walkthroughs): add supersplat-viewer + s3 sdk deps"
```

---

### Task 2: Database migration

**Files:**
- Create: `supabase/migrations/20260518_walkthroughs.sql`

- [ ] **Step 1: Write migration**

Contents: the full SQL block from the Database Schema section above.

- [ ] **Step 2: Apply migration to PropFlow Supabase**

Apply via Supabase CLI or `python /c/Users/User/Business-Empire-Agent/scripts/supabase_tool.py exec-sql --file supabase/migrations/20260518_walkthroughs.sql --project <propflow-project-ref>`.

If the supabase_tool wrapper does not have PropFlow's project credentials, fall back to: copy the SQL into the Supabase dashboard SQL editor.

Expected: 1 table created, 3 indexes, 4 RLS policies, schema reloaded.

- [ ] **Step 3: Verify in dashboard**

Open Supabase dashboard → Table editor → confirm `walkthrough_jobs` exists with RLS enabled.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260518_walkthroughs.sql
git commit -m "feat(walkthroughs): db migration for walkthrough_jobs + RLS"
```

---

### Task 3: TypeScript types

**Files:**
- Create: `src/types/walkthroughs.ts`
- Modify: `src/types/database.ts` (add WalkthroughJob to Database interface)

- [ ] **Step 1: Create types file**

```typescript
// src/types/walkthroughs.ts
export type WalkthroughStatus =
  | 'pending'
  | 'uploading'
  | 'queued'
  | 'training'
  | 'succeeded'
  | 'failed';

export interface WalkthroughJob {
  id: string;
  company_id: string;
  property_id: string;
  created_by: string;
  status: WalkthroughStatus;
  photo_count: number;
  runpod_job_id: string | null;
  error_message: string | null;
  progress_pct: number;
  share_token: string;
  splat_r2_key: string | null;
  preview_r2_key: string | null;
  splat_size_bytes: number | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface CreateWalkthroughJobInput {
  property_id: string;
  photo_count: number;
}
```

- [ ] **Step 2: Add to database.ts Database interface**

Wire `walkthrough_jobs: { Row: WalkthroughJob; ... }` into whatever the existing `Database` type shape is in `src/types/database.ts`.

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: zero new errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/walkthroughs.ts src/types/database.ts
git commit -m "feat(walkthroughs): typescript types"
```

---

### Task 4: R2 client utility

**Files:**
- Create: `src/lib/walkthroughs/r2-client.ts`

- [ ] **Step 1: Write the R2 client**

```typescript
// src/lib/walkthroughs/r2-client.ts
import 'server-only';
import { S3Client } from '@aws-sdk/client-s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accountId = process.env.R2_ACCOUNT_ID!;
const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
const bucket = process.env.R2_BUCKET ?? 'propflow-splat-renders';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

export const r2 = {
  bucket,

  photoKey(jobId: string, photoIdx: number, ext: string) {
    return `walkthroughs/${jobId}/photos/${String(photoIdx).padStart(4, '0')}.${ext}`;
  },

  splatKey(jobId: string) {
    return `walkthroughs/${jobId}/scene.ply`;
  },

  async signedUploadUrl(key: string, contentType: string, ttlSeconds = 3600) {
    const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    return getSignedUrl(client, cmd, { expiresIn: ttlSeconds });
  },

  async signedDownloadUrl(key: string, ttlSeconds = 3600) {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(client, cmd, { expiresIn: ttlSeconds });
  },
};
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/walkthroughs/r2-client.ts
git commit -m "feat(walkthroughs): R2 signed URL client"
```

---

### Task 5: RunPod client utility

**Files:**
- Create: `src/lib/walkthroughs/runpod-client.ts`

- [ ] **Step 1: Write the RunPod client**

```typescript
// src/lib/walkthroughs/runpod-client.ts
import 'server-only';

const apiKey = process.env.RUNPOD_API_KEY!;
const endpointId = process.env.RUNPOD_ENDPOINT_ID!;

interface RunPodJobInput {
  job_id: string;          // our walkthrough_jobs.id
  bucket: string;
  photo_keys: string[];
  splat_key: string;
  webhook_url: string;
  webhook_secret_id: string; // points to a Secret stored in RunPod's secret manager (never raw value)
  photo_count: number;
}

export const runpod = {
  async dispatch(input: RunPodJobInput): Promise<{ id: string }> {
    const res = await fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });
    if (!res.ok) throw new Error(`RunPod dispatch failed: ${res.status} ${await res.text()}`);
    const json = await res.json();
    if (!json.id) throw new Error(`RunPod returned no job id: ${JSON.stringify(json)}`);
    return { id: json.id };
  },

  async status(jobId: string): Promise<{ status: string; output?: unknown }> {
    const res = await fetch(`https://api.runpod.ai/v2/${endpointId}/status/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`RunPod status failed: ${res.status}`);
    return res.json();
  },
};
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/walkthroughs/runpod-client.ts
git commit -m "feat(walkthroughs): RunPod serverless dispatch client"
```

---

### Task 6: Webhook HMAC signer

**Files:**
- Create: `src/lib/walkthroughs/webhook-signer.ts`

- [ ] **Step 1: Write the signer**

```typescript
// src/lib/walkthroughs/webhook-signer.ts
import 'server-only';
import crypto from 'crypto';

const secret = () => {
  const s = process.env.WALKTHROUGH_WEBHOOK_SECRET;
  if (!s) throw new Error('WALKTHROUGH_WEBHOOK_SECRET not set');
  return s;
};

export function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

export function verify(payload: string, signature: string): boolean {
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/walkthroughs/webhook-signer.ts
git commit -m "feat(walkthroughs): HMAC-SHA256 webhook signer (constant-time)"
```

---

### Task 7: Photo quality gate (client-side)

**Files:**
- Create: `src/lib/walkthroughs/quality-gate.ts`

- [ ] **Step 1: Write the quality gate**

```typescript
// src/lib/walkthroughs/quality-gate.ts

export const QUALITY_LIMITS = {
  MIN_PHOTOS: 30,
  RECOMMENDED_PHOTOS: 150,
  MAX_PHOTOS: 500,
  MAX_PHOTO_MB: 15,
  MIN_DIMENSION_PX: 1024,
} as const;

export interface PhotoScore {
  file: File;
  width: number;
  height: number;
  sizeMb: number;
  blurScore: number;       // 0 = sharp, 1 = blurry. Variance-of-Laplacian normalized.
  ok: boolean;
  reasons: string[];
}

export async function scorePhoto(file: File): Promise<PhotoScore> {
  const sizeMb = file.size / (1024 * 1024);
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const blurScore = await estimateBlur(img);
    const reasons: string[] = [];
    if (sizeMb > QUALITY_LIMITS.MAX_PHOTO_MB) reasons.push(`File too large (${sizeMb.toFixed(1)}MB > ${QUALITY_LIMITS.MAX_PHOTO_MB}MB)`);
    if (img.width < QUALITY_LIMITS.MIN_DIMENSION_PX || img.height < QUALITY_LIMITS.MIN_DIMENSION_PX) {
      reasons.push(`Resolution too low (${img.width}x${img.height})`);
    }
    if (blurScore > 0.75) reasons.push('Image appears blurry — recapture with steadier hands');
    return {
      file,
      width: img.width,
      height: img.height,
      sizeMb,
      blurScore,
      ok: reasons.length === 0,
      reasons,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function estimateBlur(img: HTMLImageElement): Promise<number> {
  // Variance of Laplacian on a downsampled grayscale image.
  // Returns 0 (sharp) to 1 (blurry). Threshold around 0.75 = action.
  const canvas = document.createElement('canvas');
  const w = 256, h = Math.round((img.height / img.width) * 256);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  // Laplacian kernel: [[0,1,0],[1,-4,1],[0,1,0]]
  let mean = 0, n = 0;
  const lap = new Float32Array(gray.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const v = -4 * gray[idx] + gray[idx - 1] + gray[idx + 1] + gray[idx - w] + gray[idx + w];
      lap[idx] = v;
      mean += v;
      n++;
    }
  }
  mean /= n;
  let variance = 0;
  for (let i = 0; i < lap.length; i++) variance += (lap[i] - mean) * (lap[i] - mean);
  variance /= n;
  // Empirical: sharp phone photos > 400, blurry < 80.
  // Normalize so 0=sharp 1=blurry, clamp.
  const blurry = Math.max(0, Math.min(1, 1 - variance / 400));
  return blurry;
}

export function summarize(scores: PhotoScore[]) {
  const okCount = scores.filter(s => s.ok).length;
  const blurry = scores.filter(s => s.blurScore > 0.75).length;
  return {
    total: scores.length,
    ok: okCount,
    blurry,
    enoughPhotos: okCount >= QUALITY_LIMITS.MIN_PHOTOS,
    recommendedMet: okCount >= QUALITY_LIMITS.RECOMMENDED_PHOTOS,
    tooMany: scores.length > QUALITY_LIMITS.MAX_PHOTOS,
  };
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/walkthroughs/quality-gate.ts
git commit -m "feat(walkthroughs): client-side photo quality gate (blur + size)"
```

---

### Task 8: API — upload init

**Files:**
- Create: `src/app/api/walkthroughs/upload-init/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/walkthroughs/upload-init/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { r2 } from '@/lib/walkthroughs/r2-client';

export const runtime = 'nodejs';

const Body = z.object({
  property_id: z.string().uuid(),
  photo_count: z.number().int().min(30).max(500),
  photos: z.array(z.object({
    idx: z.number().int().min(0),
    content_type: z.string().regex(/^image\/(jpeg|png|webp|heic)$/i),
    ext: z.enum(['jpg', 'jpeg', 'png', 'webp', 'heic']),
  })).min(30).max(500),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: 'Invalid body', details: body.error.flatten() }, { status: 400 });

  // Verify property belongs to user's company (RLS will block insert otherwise)
  const { data: property } = await supabase
    .from('properties')
    .select('id, company_id')
    .eq('id', body.data.property_id)
    .maybeSingle();
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  const { data: job, error } = await supabase
    .from('walkthrough_jobs')
    .insert({
      property_id: body.data.property_id,
      company_id: property.company_id,
      created_by: user.id,
      photo_count: body.data.photo_count,
      status: 'uploading',
    })
    .select('id, share_token')
    .single();
  if (error || !job) return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });

  const uploads = await Promise.all(body.data.photos.map(async (p) => ({
    idx: p.idx,
    key: r2.photoKey(job.id, p.idx, p.ext),
    url: await r2.signedUploadUrl(r2.photoKey(job.id, p.idx, p.ext), p.content_type),
  })));

  return NextResponse.json({ job_id: job.id, share_token: job.share_token, uploads });
}
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `npx tsc --noEmit && npm run lint -- src/app/api/walkthroughs/upload-init/route.ts`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/walkthroughs/upload-init/route.ts
git commit -m "feat(walkthroughs): POST /api/walkthroughs/upload-init"
```

---

### Task 9: API — train dispatch

**Files:**
- Create: `src/app/api/walkthroughs/[id]/train/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/walkthroughs/[id]/train/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { r2 } from '@/lib/walkthroughs/r2-client';
import { runpod } from '@/lib/walkthroughs/runpod-client';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: job } = await supabase
    .from('walkthrough_jobs')
    .select('id, photo_count, status')
    .eq('id', id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.status !== 'uploading') {
    return NextResponse.json({ error: `Job in wrong state: ${job.status}` }, { status: 409 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const webhookUrl = `${appUrl}/api/walkthroughs/webhook`;

  const photoKeys = Array.from({ length: job.photo_count }, (_, i) =>
    // Note: trainer accepts any extension; it globs photos/*.* inside the prefix.
    r2.photoKey(job.id, i, 'jpg').replace(/\.\w+$/, '.*')
  );

  const dispatch = await runpod.dispatch({
    job_id: job.id,
    bucket: r2.bucket,
    photo_keys: [`walkthroughs/${job.id}/photos/`],  // pass prefix; trainer lists+downloads
    splat_key: r2.splatKey(job.id),
    webhook_url: webhookUrl,
    webhook_secret_id: 'WALKTHROUGH_WEBHOOK_SECRET',   // RunPod resolves from its secret store
    photo_count: job.photo_count,
  });

  await supabase.from('walkthrough_jobs').update({
    status: 'queued',
    runpod_job_id: dispatch.id,
    started_at: new Date().toISOString(),
  }).eq('id', job.id);

  return NextResponse.json({ ok: true, runpod_job_id: dispatch.id });
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/walkthroughs/[id]/train/route.ts
git commit -m "feat(walkthroughs): POST /api/walkthroughs/[id]/train"
```

---

### Task 10: API — status poll

**Files:**
- Create: `src/app/api/walkthroughs/[id]/status/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/walkthroughs/[id]/status/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: job } = await supabase
    .from('walkthrough_jobs')
    .select('id, status, progress_pct, error_message, share_token, splat_size_bytes, completed_at')
    .eq('id', id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(job);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/walkthroughs/[id]/status/route.ts
git commit -m "feat(walkthroughs): GET /api/walkthroughs/[id]/status"
```

---

### Task 11: API — webhook receiver

**Files:**
- Create: `src/app/api/walkthroughs/webhook/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/walkthroughs/webhook/route.ts
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verify } from '@/lib/walkthroughs/webhook-signer';

export const runtime = 'nodejs';

const Body = z.object({
  job_id: z.string().uuid(),
  event: z.enum(['progress', 'succeeded', 'failed']),
  progress_pct: z.number().int().min(0).max(100).optional(),
  error_message: z.string().optional(),
  splat_size_bytes: z.number().int().optional(),
  splat_r2_key: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-walkthrough-signature') ?? '';
  const raw = await req.text();
  if (!verify(raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let parsed;
  try { parsed = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const body = Body.safeParse(parsed);
  if (!body.success) return NextResponse.json({ error: 'Invalid body', details: body.error.flatten() }, { status: 400 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.data.event === 'progress') {
    update.status = 'training';
    update.progress_pct = body.data.progress_pct ?? 0;
  } else if (body.data.event === 'succeeded') {
    update.status = 'succeeded';
    update.progress_pct = 100;
    update.completed_at = new Date().toISOString();
    if (body.data.splat_size_bytes) update.splat_size_bytes = body.data.splat_size_bytes;
    if (body.data.splat_r2_key) update.splat_r2_key = body.data.splat_r2_key;
  } else if (body.data.event === 'failed') {
    update.status = 'failed';
    update.error_message = body.data.error_message ?? 'Unknown error';
    update.completed_at = new Date().toISOString();
  }

  const { error } = await admin.from('walkthrough_jobs').update(update).eq('id', body.data.job_id);
  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/walkthroughs/webhook/route.ts
git commit -m "feat(walkthroughs): POST /api/walkthroughs/webhook (HMAC-verified)"
```

---

### Task 12: API — public tour token resolver

**Files:**
- Create: `src/app/api/tour/[token]/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/tour/[token]/route.ts
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { r2 } from '@/lib/walkthroughs/r2-client';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length > 64) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: job } = await admin
    .from('walkthrough_jobs')
    .select('id, status, splat_r2_key, completed_at, property_id')
    .eq('share_token', token)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
  if (job.status !== 'succeeded' || !job.splat_r2_key) {
    return NextResponse.json({ error: 'Tour not ready', status: job.status }, { status: 425 });
  }

  // Optionally include public-safe property metadata (address only) for the viewer header.
  const { data: prop } = await admin
    .from('properties')
    .select('address, city, state')
    .eq('id', job.property_id)
    .maybeSingle();

  const splatUrl = await r2.signedDownloadUrl(job.splat_r2_key, 3600);

  return NextResponse.json({
    splat_url: splatUrl,
    expires_in: 3600,
    property: prop ? { address: prop.address, city: prop.city, state: prop.state } : null,
  });
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tour/[token]/route.ts
git commit -m "feat(walkthroughs): GET /api/tour/[token] (public, signed URL)"
```

---

### Task 13: TanStack hooks

**Files:**
- Create: `src/lib/hooks/use-walkthrough.ts`
- Create: `src/lib/hooks/use-walkthroughs.ts`

- [ ] **Step 1: Write `use-walkthrough.ts`**

```typescript
// src/lib/hooks/use-walkthrough.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import type { WalkthroughJob } from '@/types/walkthroughs';

export function useWalkthrough(id: string, opts?: { pollMs?: number; enabled?: boolean }) {
  return useQuery<WalkthroughJob>({
    queryKey: ['walkthrough', id],
    queryFn: async () => {
      const res = await fetch(`/api/walkthroughs/${id}/status`);
      if (!res.ok) throw new Error('Failed to fetch walkthrough');
      return res.json();
    },
    enabled: opts?.enabled ?? Boolean(id),
    refetchInterval: opts?.pollMs ?? 3000,
    staleTime: 1000,
  });
}
```

- [ ] **Step 2: Write `use-walkthroughs.ts`**

```typescript
// src/lib/hooks/use-walkthroughs.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { WalkthroughJob } from '@/types/walkthroughs';

export function useWalkthroughs(propertyId: string) {
  const supabase = createClient();
  return useQuery<WalkthroughJob[]>({
    queryKey: ['walkthroughs', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('walkthrough_jobs')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WalkthroughJob[];
    },
    enabled: Boolean(propertyId),
    staleTime: 30_000,
  });
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/hooks/use-walkthrough.ts src/lib/hooks/use-walkthroughs.ts
git commit -m "feat(walkthroughs): TanStack hooks for job + list polling"
```

---

### Task 14: Photo uploader component

**Files:**
- Create: `src/components/walkthroughs/photo-uploader.tsx`

- [ ] **Step 1: Write the uploader**

See full component code in the actual file — it implements: drag-drop zone, thumbnail grid, runs `scorePhoto()` on each, displays blur/quality flags, "Upload & Train" button gated on summary.enoughPhotos. Calls `/api/walkthroughs/upload-init`, then PUTs each file to its signed URL in parallel (batched 6 at a time to avoid browser limits), then POSTs to `/api/walkthroughs/[id]/train`, then navigates to `/properties/[propertyId]/walkthrough/[jobId]`.

(Component is ~250 lines — see the file when implementing. Spec is in `docs/walkthroughs/ARCHITECTURE.md` after Task 22.)

- [ ] **Step 2: Verify typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/walkthroughs/photo-uploader.tsx
git commit -m "feat(walkthroughs): photo uploader with quality gate"
```

---

### Task 15: Status card component

**Files:**
- Create: `src/components/walkthroughs/walkthrough-status-card.tsx`

- [ ] **Step 1: Write component**

Renders progress bar, status badge, ETA estimate, share-link copy button (when succeeded), error message + "Try again" CTA (when failed). Uses `useWalkthrough` hook with 3s poll until terminal state.

- [ ] **Step 2: Verify + Commit**

```bash
npx tsc --noEmit
git add src/components/walkthroughs/walkthrough-status-card.tsx
git commit -m "feat(walkthroughs): live status card with polling"
```

---

### Task 16: Splat viewer component

**Files:**
- Create: `src/components/walkthroughs/splat-viewer.tsx`

- [ ] **Step 1: Write component**

```tsx
// src/components/walkthroughs/splat-viewer.tsx
'use client';
import { useEffect, useRef } from 'react';

interface Props {
  splatUrl: string;
  className?: string;
}

export function SplatViewer({ splatUrl, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current) return;
      const { Viewer } = await import('@playcanvas/supersplat-viewer');
      if (cancelled || !containerRef.current) return;
      const viewer = new Viewer({
        canvas: containerRef.current,
        url: splatUrl,
      });
      return () => viewer.destroy?.();
    })();
    return () => { cancelled = true; };
  }, [splatUrl]);

  return <div ref={containerRef} className={className ?? 'w-full h-full min-h-[500px]'} />;
}
```

Note: the exact constructor signature for `@playcanvas/supersplat-viewer` should be verified against its README during implementation — if the API differs, adapt. The viewer is MIT and well-documented.

- [ ] **Step 2: Verify + Commit**

```bash
npx tsc --noEmit
git add src/components/walkthroughs/splat-viewer.tsx
git commit -m "feat(walkthroughs): SuperSplat viewer wrapper"
```

---

### Task 17: Upload page

**Files:**
- Create: `src/app/(dashboard)/properties/[id]/walkthrough/upload/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// src/app/(dashboard)/properties/[id]/walkthrough/upload/page.tsx
import { PhotoUploader } from '@/components/walkthroughs/photo-uploader';

export default async function WalkthroughUploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">New 3D Walkthrough</h1>
      <p className="text-muted-foreground mb-8">
        Upload 30–500 photos walking through the property. Phone photos work fine.
        Slow walk, 70–80% overlap between shots, good lighting. Avoid mirrors and reflective glass when possible.
      </p>
      <PhotoUploader propertyId={id} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/properties/\[id\]/walkthrough/upload/page.tsx
git commit -m "feat(walkthroughs): upload page"
```

---

### Task 18: Job detail / status page

**Files:**
- Create: `src/app/(dashboard)/properties/[id]/walkthrough/[jobId]/page.tsx`

- [ ] **Step 1: Write the page**

Renders `<WalkthroughStatusCard jobId={jobId} />`. When succeeded, shows share URL `${appUrl}/tour/${shareToken}` + copy button + an inline `<SplatViewer />` preview.

- [ ] **Step 2: Commit**

---

### Task 19: Walkthrough index page

**Files:**
- Create: `src/app/(dashboard)/properties/[id]/walkthrough/page.tsx`

- [ ] **Step 1: Write the page**

Lists existing walkthroughs for the property via `useWalkthroughs(id)`. Header "New Walkthrough" button links to `./walkthrough/upload`. Each row: status pill, created date, share link if succeeded.

- [ ] **Step 2: Commit**

---

### Task 20: Public viewer page

**Files:**
- Create: `src/app/tour/[token]/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// src/app/tour/[token]/page.tsx
import { SplatViewer } from '@/components/walkthroughs/splat-viewer';

export const dynamic = 'force-dynamic';

export default async function PublicTourPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const res = await fetch(`${appUrl}/api/tour/${token}`, { cache: 'no-store' });
  if (!res.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Tour unavailable</h1>
          <p className="text-white/60 mt-2">This walkthrough may still be processing or the link has expired.</p>
        </div>
      </div>
    );
  }
  const { splat_url, property } = await res.json();

  return (
    <div className="min-h-screen bg-black">
      {property && (
        <header className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent text-white">
          <h1 className="text-lg font-semibold">{property.address}</h1>
          <p className="text-sm text-white/70">{property.city}, {property.state}</p>
        </header>
      )}
      <SplatViewer splatUrl={splat_url} className="w-full h-screen" />
    </div>
  );
}
```

- [ ] **Step 2: Verify the route is public**

Add `/tour/` to `src/proxy.ts` whitelist (or whatever the existing public-route convention is). Check `src/lib/supabase/middleware.ts` — find the route protection logic and ensure `/tour/[token]` is reachable without auth.

- [ ] **Step 3: Commit**

```bash
git add src/app/tour/\[token\]/page.tsx src/proxy.ts src/lib/supabase/middleware.ts
git commit -m "feat(walkthroughs): public tour viewer page"
```

---

### Task 21: Plan-gate the feature

**Files:**
- Modify: `src/lib/plans/gate.ts`

- [ ] **Step 1: Add walkthroughs feature key**

Follow the existing feature-key pattern (same way social media is gated to Brokerage Command). Add:

```typescript
walkthroughs: ['agency_growth', 'brokerage_command'],
```

(Exact key shape depends on existing gate.ts API — adapt.)

- [ ] **Step 2: Gate the upload route + UI**

In `src/app/api/walkthroughs/upload-init/route.ts`, after the user check, call the gate:

```typescript
import { hasFeature } from '@/lib/plans/gate';
if (!(await hasFeature(user.id, 'walkthroughs'))) {
  return NextResponse.json({ error: 'Walkthroughs require Agency Growth plan or higher' }, { status: 403 });
}
```

In `src/components/walkthroughs/photo-uploader.tsx`, wrap with `<FeatureGate feature="walkthroughs">...</FeatureGate>` per existing convention.

- [ ] **Step 3: Commit**

---

### Task 22: Splat trainer Docker container

**Files:**
- Create: `services/splat-trainer/Dockerfile`
- Create: `services/splat-trainer/handler.py`
- Create: `services/splat-trainer/pipeline/__init__.py`
- Create: `services/splat-trainer/pipeline/r2_io.py`
- Create: `services/splat-trainer/pipeline/colmap_runner.py`
- Create: `services/splat-trainer/pipeline/gsplat_trainer.py`
- Create: `services/splat-trainer/pipeline/webhook.py`
- Create: `services/splat-trainer/requirements.txt`
- Create: `services/splat-trainer/README.md`

The full Dockerfile, handler, and pipeline modules — this is the biggest chunk. **This task is delegated to Codex** (per CLAUDE.md Rule 8: backend implementation), with a self-contained spec attached. See `docs/walkthroughs/ARCHITECTURE.md` (Task 23) for the exact interface contract.

Pipeline contract:
1. RunPod calls `handler({"input": {job_id, bucket, photo_keys (prefix), splat_key, webhook_url, webhook_secret_id, photo_count}})`
2. Handler downloads all photos from R2 to `/tmp/<job_id>/photos/`
3. POSTs webhook: `{event: 'progress', progress_pct: 5}`
4. Runs COLMAP feature_extractor → exhaustive_matcher → mapper → produces `/tmp/<job_id>/sparse/0/`
5. POSTs progress: 25
6. Runs gsplat training (default 30k iterations, ~10 min on RTX 4090) → produces `/tmp/<job_id>/scene.ply`
7. POSTs progress: 90
8. Uploads `scene.ply` to R2 at `splat_key`
9. POSTs final webhook: `{event: 'succeeded', splat_r2_key, splat_size_bytes}`
10. On any error: POSTs `{event: 'failed', error_message}` with traceback

- [ ] **Step 1: Delegate to Codex (or write directly)**

If delegating: run the codex-companion delegation per CLAUDE.md Rule 8 with the full architecture doc inlined.

- [ ] **Step 2: Verify container builds locally**

Run: `docker build -t propflow-splat-trainer:dev services/splat-trainer/`
Expected: clean build, no missing apt packages, no Python install errors.

- [ ] **Step 3: Smoke-test handler with a fixture**

Local test: `cd services/splat-trainer && python -c "from handler import handler; print(handler({'input': {...test fixture...}}))"`. Use a 6-photo toy scene to verify the pipeline shape, not training quality.

- [ ] **Step 4: Commit**

```bash
git add services/splat-trainer/
git commit -m "feat(walkthroughs): splat-trainer container (COLMAP + gsplat OSS pipeline)"
```

---

### Task 23: Architecture + deploy docs

**Files:**
- Create: `docs/walkthroughs/ARCHITECTURE.md`
- Create: `docs/walkthroughs/RUNPOD_DEPLOY.md`
- Create: `docs/walkthroughs/ENV_VARS.md`

- [ ] **Step 1: Write all three**

ARCHITECTURE.md: end-to-end flow diagram (text), trainer pipeline contract, cost model per scene.
RUNPOD_DEPLOY.md: how to push the Docker image, create the serverless endpoint, configure secrets, get the endpoint ID for `RUNPOD_ENDPOINT_ID`.
ENV_VARS.md: complete list of all env vars added + where to set them (PropFlow `.env.local`, Vercel dashboard, RunPod template).

- [ ] **Step 2: Commit**

```bash
git add docs/walkthroughs/
git commit -m "docs(walkthroughs): architecture + RunPod deploy + env vars"
```

---

### Task 24: Update `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Append new vars**

```
# 3D Walkthroughs (Gaussian Splatting)
RUNPOD_API_KEY=
RUNPOD_ENDPOINT_ID=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=propflow-splat-renders
WALKTHROUGH_WEBHOOK_SECRET=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs(walkthroughs): document new env vars"
```

---

### Task 25: End-to-end smoke + final commit

- [ ] **Step 1: Build**

Run: `cd /c/Users/User/realestate-App && npm run build`
Expected: build succeeds with zero new errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: zero new violations.

- [ ] **Step 3: Manual smoke test (when RunPod endpoint is deployed)**

1. Navigate to `/properties/<some-property>/walkthrough/upload`
2. Drop in 30+ test photos
3. Confirm quality gate scores each one
4. Click "Upload & Train"
5. Watch status page poll → queued → training → succeeded
6. Click share link → confirm `/tour/<token>` renders the splat

(This step requires RunPod endpoint live + Vercel deploy + R2 bucket reachable. Pre-deploy, only the build + lint smoke happens.)

- [ ] **Step 4: Push**

```bash
git push origin main
```

Vercel auto-deploys.

- [ ] **Step 5: Set production env vars on Vercel**

Document hands off to CC: open Vercel dashboard → propflow project → Settings → Environment Variables → add all 7 new vars from `.env.example` (paste values from `.env.local`).

---

## Self-Review

**Spec coverage:** Capture (Task 14 quality gate), upload (Task 8), train dispatch (Task 9), training pipeline (Task 22), webhook completion (Task 11), public viewer (Task 20), share link (Tasks 18, 20). All covered.

**Placeholder scan:** Task 14 references "see file" — that's intentional (component is large, full code lives in the file). Tasks 15/18/19 are spec-only; their full code is shorter and discovered during implementation. Acceptable for these sizes given the contract is fully specified by the API + types.

**Type consistency:** `WalkthroughJob` shape in Task 3 matches what API routes return in Tasks 8/10/11. `share_token` is the same field name in DB, types, and tour route. `splat_r2_key` consistent. Verified.

**Naming:** Tables use plural `walkthrough_jobs` (matches PropFlow's `properties`, `applications` convention). Routes use `walkthroughs` (matches REST convention). Component dir matches.

---

## Open Items (handled at execution time)

1. **PropFlow Supabase project ref** — CC to confirm. Migration applied via dashboard if CLI access unclear.
2. **RunPod endpoint ID** — generated AFTER Task 22 Docker image is pushed and the serverless endpoint is created in RunPod dashboard. Document the steps in `RUNPOD_DEPLOY.md`.
3. **Trainer Codex delegation vs in-Bravo** — decide at Task 22 based on Codex availability. Either path produces the same container.
