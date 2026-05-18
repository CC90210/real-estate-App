# 3D Walkthroughs — Environment Variables

All new env vars introduced by the walkthroughs feature. Copy this block into `.env.local` and into Vercel project settings.

## Required

```bash
# RunPod Serverless (GPU compute — the only third-party paid service)
RUNPOD_API_KEY=                  # RunPod Console → Settings → API Keys
RUNPOD_ENDPOINT_ID=              # ID of the propflow-splat-trainer endpoint

# Cloudflare R2 (photo + splat storage)
R2_ACCOUNT_ID=                   # Cloudflare dashboard → R2 → top right
R2_ACCESS_KEY_ID=                # R2 → Manage R2 API Tokens → create with Object Read+Write
R2_SECRET_ACCESS_KEY=            # Shown only once at token creation
R2_BUCKET=propflow-splat-renders # The bucket name (default OK)

# Webhook HMAC (must match the value set on the RunPod endpoint env vars)
WALKTHROUGH_WEBHOOK_SECRET=      # Generate with: openssl rand -hex 32

# Already exists in PropFlow, but the walkthroughs flow depends on it being correct in production
NEXT_PUBLIC_APP_URL=https://propflow.pro  # Used as the base for RunPod webhook callbacks + tour share URLs
```

## Where each value comes from

| Variable | How to get it |
|---|---|
| `RUNPOD_API_KEY` | RunPod Console → Settings → API Keys → Create. Scope: Read+Write. |
| `RUNPOD_ENDPOINT_ID` | After deploying the serverless endpoint (see `RUNPOD_DEPLOY.md`), the endpoint detail page shows the ID. |
| `R2_ACCOUNT_ID` | Visible in the top-right of any Cloudflare R2 page (32-char hex string). |
| `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` | Cloudflare R2 → Manage R2 API Tokens → Create API Token. Permission: Object Read & Write. Optionally scope to the `propflow-splat-renders` bucket. TTL: forever. |
| `R2_BUCKET` | Leave as `propflow-splat-renders` unless you've named your bucket differently. |
| `WALKTHROUGH_WEBHOOK_SECRET` | Generate locally: `openssl rand -hex 32`. **Set the same value in PropFlow's `.env.local` AND in the RunPod endpoint's env vars** — both sides must agree. |
| `NEXT_PUBLIC_APP_URL` | Probably already set. In production it's `https://propflow.pro`. In dev it's `http://localhost:3000`. |

## Where to set each

| Variable | PropFlow `.env.local` | PropFlow Vercel | RunPod endpoint env |
|---|---|---|---|
| `RUNPOD_API_KEY` | ✅ | ✅ | — |
| `RUNPOD_ENDPOINT_ID` | ✅ | ✅ | — |
| `R2_ACCOUNT_ID` | ✅ | ✅ | ✅ |
| `R2_ACCESS_KEY_ID` | ✅ | ✅ | ✅ |
| `R2_SECRET_ACCESS_KEY` | ✅ | ✅ | ✅ |
| `R2_BUCKET` | ✅ | ✅ | — (passed via job input) |
| `WALKTHROUGH_WEBHOOK_SECRET` | ✅ | ✅ | ✅ (MUST match) |
| `NEXT_PUBLIC_APP_URL` | ✅ | ✅ | — |

## Append to `.env.example`

The `.env.example` file in the repo root is protected from agent writes. **You'll need to manually append this block to it** so other devs know the vars exist:

```bash

# === 3D Walkthroughs (Gaussian Splatting) ===
RUNPOD_API_KEY=
RUNPOD_ENDPOINT_ID=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=propflow-splat-renders
WALKTHROUGH_WEBHOOK_SECRET=
```

## Security notes

- `RUNPOD_API_KEY`, `R2_SECRET_ACCESS_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `WALKTHROUGH_WEBHOOK_SECRET` are **secrets** — never log them, never commit them, never expose them to the client. `next.config.ts`'s CSP should already prevent client-side leakage but double-check that none of these are prefixed with `NEXT_PUBLIC_` (they aren't, in our setup).
- The webhook secret rotation procedure: generate a new secret, update both PropFlow and the RunPod endpoint env in a single push, then redeploy the RunPod endpoint. Brief window of mismatched signatures during the swap; no in-flight job will fail because RunPod doesn't sign until the job is well underway.
