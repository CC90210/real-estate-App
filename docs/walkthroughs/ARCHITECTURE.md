# 3D Walkthroughs — Architecture

## What it does

A real estate agent uploads phone photos of a listing through PropFlow. The system trains a 3D Gaussian Splat scene on rented GPU compute, stores the result on Cloudflare R2, and exposes a public share link tenants can click to walk through the property in their browser. Everything except the GPU rental is self-hosted; the GPU is per-job serverless and scales to zero between jobs.

## End-to-end flow

```
Agent (browser)                 PropFlow Next.js              Cloudflare R2             RunPod Serverless       Tenant (browser)
─────────────────               ─────────────────             ──────────────            ──────────────────      ─────────────────
1. Drop 30–500 photos
   client-side quality gate
   (blur + size + dimension)
2. POST /api/walkthroughs/
        upload-init           ──▶ insert walkthrough_jobs row
                                   issue N signed PUT URLs
3.  ◀──────────────────────────  job_id, share_token, uploads[]
4. PUT each photo direct ──────────────────────────────────▶  walkthroughs/<job_id>/photos/0001.jpg ...
   (concurrency 6)
5. POST /api/walkthroughs/
        <id>/train            ──▶ runpod.dispatch(...)        ──────────────────────▶  queue job
                                  set status=queued
                                  store runpod_job_id
                                                                                       6. download photos
                                                                                          POST progress 5%   ◀── /api/walkthroughs/webhook
                                                                                          run COLMAP SfM
                                                                                          POST progress 25%
                                                                                          gsplat training (~10 min RTX 4090)
                                                                                          POST progress 90%
                                                                                          upload scene.ply  ──▶ walkthroughs/<job_id>/scene.ply
                                                                                          POST succeeded   ◀── /api/walkthroughs/webhook
                                                                                                                  update splat_r2_key
                                                                                                                  set status=succeeded
7. Agent polls /status endpoint, gets share_token
8. Agent shares URL: https://propflow.pro/tour/<share_token>
                                                                                                                                          9. GET /tour/<token>
                                                                                                                                          10. server fetches signed R2 URL
                                                                                                                                          11. iframe → /api/viewer?content=<signed-url>
                                                                                                                                              SuperSplat viewer renders splat
```

## Component map

### Frontend
- `src/app/(dashboard)/properties/[id]/walkthrough/page.tsx` — list of walkthroughs for a property
- `src/app/(dashboard)/properties/[id]/walkthrough/upload/page.tsx` — capture / upload UI
- `src/app/(dashboard)/properties/[id]/walkthrough/[jobId]/page.tsx` — per-job detail + status + inline preview
- `src/app/tour/[token]/page.tsx` — **public** tenant-facing viewer (no auth)
- `src/components/walkthroughs/photo-uploader.tsx` — drag-drop, client-side blur/quality scoring, parallel uploads
- `src/components/walkthroughs/walkthrough-status-card.tsx` — polling status + share-link copy
- `src/components/walkthroughs/splat-viewer.tsx` — iframe → `/api/viewer` (sandboxed)
- `src/lib/walkthroughs/quality-gate.ts` — variance-of-Laplacian blur detector (runs on client)
- `src/lib/hooks/use-walkthrough.ts` + `use-walkthroughs.ts` — TanStack Query, auto-polling stops on terminal status

### API
- `POST /api/walkthroughs/upload-init` — auth + RLS-scoped, creates job row, issues N R2 signed PUTs
- `POST /api/walkthroughs/[id]/train` — dispatches to RunPod, stores `runpod_job_id`
- `GET /api/walkthroughs/[id]/status` — auth + RLS-scoped polling endpoint
- `POST /api/walkthroughs/webhook` — RunPod callback, HMAC-SHA256 signature required, uses admin client to bypass RLS
- `GET /api/tour/[token]` — public token resolver, returns signed `.ply` URL + property metadata
- `GET /api/viewer` — server-renders SuperSplat HTML+CSS+JS with `?content=<r2-url>` param; host allowlist on the content URL

### Database (`supabase/migrations/20260518_walkthroughs.sql`)
- `walkthrough_jobs` — single table, lifecycle: `pending → uploading → queued → training → (succeeded | failed)`
- 4 RLS policies, all company-scoped via `get_user_company_id()`
- `share_token` is a random 24-byte base64 string, indexed for fast public lookups
- `updated_at` auto-managed via trigger

### Trainer (`services/splat-trainer/`)
Self-contained Docker image deployed to RunPod Serverless. Receives a JSON event, runs the pipeline, POSTs HMAC-signed webhooks back. **Pure OSS** — no Inria, no proprietary code:
- COLMAP 3.10 (BSD-3) built from source
- gsplat (Apache-2 from `nerfstudio-project`)
- Python 3.11 + boto3 + runpod + torch (CUDA 12.4)

### Storage (Cloudflare R2)
- Bucket: `propflow-splat-renders` (single bucket, prefixed by `walkthroughs/<job_id>/`)
- Photos: `walkthroughs/<job_id>/photos/NNNN.<ext>` (uploaded direct from browser via signed PUT)
- Splat output: `walkthroughs/<job_id>/scene.ply` (written by trainer, served via signed GET to viewer)
- Signed URL TTL: 1 hour (configurable in `r2-client.ts`)

## Cost model

| Component | Cost/scene | Cost/scene at 1,000 listings/mo |
|---|---|---|
| GPU compute (RunPod RTX 4090 serverless, ~15 min/scene) | ~$0.30 | $300 |
| R2 storage (~150 MB per scene, $0.015/GB-month) | ~$0.002/mo | $2.25/mo |
| R2 egress (free tier — Cloudflare doesn't charge egress) | $0 | $0 |
| Photo storage (~200 MB/scene during processing, deleted after) | negligible | negligible |
| **Total per listing** | **~$0.30** | **~$305/mo** |

At a charge of $25–$49 per walkthrough, gross margin is 98–99%. At any reasonable scale, GPU compute is the only meaningful cost.

## Failure modes & mitigations

| Failure | Frequency | Mitigation |
|---|---|---|
| Featureless white walls → COLMAP fails | High in modern builds | Client-side coverage hint; agent re-captures with more texture/contents in frame |
| Mirrors / reflective glass → floating artifacts | Medium | Documented in upload UI guidance |
| Blurry phone photos | High (untrained agents) | Client-side variance-of-Laplacian blur gate before upload |
| Insufficient overlap between photos | Medium | UI guidance + min photo count (30) |
| Low light | Low–medium | Client gate flags too-dark images via resolution check (proxy) |
| RunPod worker crash mid-training | Low | Job marked `failed`, agent retries; no half-state because webhook is the only state writer |
| R2 egress quota exceeded | None — Cloudflare doesn't charge egress | n/a |
| Concurrent jobs collide | None | Each job has its own R2 prefix |

## Security

- All authenticated endpoints validate `auth.getUser()` and rely on RLS for company isolation.
- Webhook signature is HMAC-SHA256 with constant-time comparison (`crypto.timingSafeEqual`).
- Public `/tour/[token]` and `/api/tour/[token]` routes accept the token only — no other identifier. Token is 24 random bytes (base64), effectively unguessable.
- `/api/viewer` route allowlists Cloudflare R2 hosts on the `?content` parameter to prevent open redirect / XSS via injected content URL.
- Service role key is server-only; never sent to the client.
- RunPod secrets (R2 keys, webhook secret) live in RunPod's secret manager, not in the container image.

## Vendor independence

The trainer container is portable. To migrate off RunPod:
- **Modal Labs:** wrap `handler()` in `@app.function(gpu="A10G")` decorator, deploy via `modal deploy`. ~1 hour migration.
- **Lambda Labs / fal.ai / replicate.com:** rebuild the image, point endpoint at the new vendor. ~2–4 hours migration.
- **Self-hosted GPU box:** run the Docker image directly with a thin queue worker (Redis Queue, Cloud Tasks, etc).

The only RunPod-specific code is the `runpod.serverless.start()` call at the bottom of `handler.py`.
