# RunPod Deployment Guide

Deploy the splat-trainer container to RunPod Serverless. ~30 minutes the first time.

## Prerequisites

- RunPod account with payment method attached (https://runpod.io)
- A container registry to host the image:
  - **Recommended:** GitHub Container Registry (`ghcr.io/cc90210/propflow-splat-trainer`) — free, integrates with GitHub Actions
  - Alternative: Docker Hub (`docker.io/cc90210/propflow-splat-trainer`)
- Docker installed locally (optional — only needed if you want to build the image yourself instead of using GitHub Actions)

## Build the container

### Option A: GitHub Actions (recommended)

A workflow file can be added at `.github/workflows/build-splat-trainer.yml` that builds + pushes the image whenever `services/splat-trainer/**` changes. Skip the local build steps.

### Option B: Local build + push

```bash
cd services/splat-trainer
docker build -t ghcr.io/cc90210/propflow-splat-trainer:latest .
docker push ghcr.io/cc90210/propflow-splat-trainer:latest
```

The build is ~3 GB and takes ~10 minutes the first time (COLMAP compiles from source). Subsequent builds use Docker layer cache.

## Create the RunPod Serverless endpoint

1. Go to RunPod Console → **Serverless** → **New Endpoint** → **Custom deployment**.

2. Fill in the form:

| Field | Value |
|---|---|
| Endpoint name | `propflow-splat-trainer` |
| Container image | `ghcr.io/cc90210/propflow-splat-trainer:latest` |
| Container registry credentials | If using a private image, add credentials here |
| GPU types | **RTX 4090** (24 GB) — recommended. **L40S** as fallback. |
| Workers — min | `0` (scales to zero when idle) |
| Workers — max | `1` (raise later as volume grows) |
| Idle timeout | `5 seconds` |
| Execution timeout | `2400 seconds` (40 min — comfortable margin over typical 15 min training) |
| Container disk | `30 GB` (the image is ~3 GB; needs headroom for photos + intermediate output) |

3. Add **Environment Variables** (these are exposed inside the container at runtime):

| Variable | Value | Source |
|---|---|---|
| `R2_ACCOUNT_ID` | (Cloudflare account ID) | Cloudflare dashboard → R2 → top right |
| `R2_ACCESS_KEY_ID` | (R2 token ID) | Cloudflare → R2 → Manage R2 API Tokens |
| `R2_SECRET_ACCESS_KEY` | (R2 token secret) | Same — shown only once at creation |
| `WALKTHROUGH_WEBHOOK_SECRET` | (matching secret on PropFlow side) | Generate with `openssl rand -hex 32`; same value goes in PropFlow `.env.local` |

4. **Save & Deploy.** The endpoint will get an ID like `abc123xyz`. Copy it.

5. Generate an **API key** for PropFlow to dispatch jobs:
   - RunPod Console → **Settings** → **API Keys** → **Create**
   - Scope: Read+Write
   - Copy the key — only shown once.

## Wire PropFlow to the endpoint

Add these to your PropFlow `.env.local` and to Vercel project settings:

```
RUNPOD_API_KEY=<the key from step 5>
RUNPOD_ENDPOINT_ID=<endpoint id from step 4>
R2_ACCOUNT_ID=<same as RunPod>
R2_ACCESS_KEY_ID=<same as RunPod>
R2_SECRET_ACCESS_KEY=<same as RunPod>
R2_BUCKET=propflow-splat-renders
WALKTHROUGH_WEBHOOK_SECRET=<same as RunPod>
NEXT_PUBLIC_APP_URL=https://propflow.pro
```

**The webhook secret MUST be identical** on both sides — RunPod signs with it, PropFlow verifies with it.

## Verify the deployment

1. Trigger a test job via PropFlow:
   - Upload 30+ photos to a test property
   - Watch the dashboard status page poll → should go `queued → training → succeeded` over ~15 min
2. On the RunPod side, check the endpoint logs:
   - RunPod Console → Serverless → propflow-splat-trainer → Logs
   - You should see `[<job_id>] Downloading photos…`, `[<job_id>] Running COLMAP…`, etc.
3. Open the `/tour/<share_token>` link as a logged-out user (incognito) and confirm the splat renders.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Job stuck in `queued` for >2 min | No workers available — quota hit | RunPod Console → upgrade plan or wait |
| Job fails immediately, error mentions `R2_ACCOUNT_ID` | Env vars not set on endpoint | Re-check step 3 |
| Job fails after photo download, error mentions COLMAP | Photos too few or featureless | Have agent re-shoot with more photos and texture |
| Webhook returns 401 in trainer logs | Secret mismatch | Re-paste `WALKTHROUGH_WEBHOOK_SECRET` on both sides |
| Splat renders but viewer is blank in browser | CSP issue with `/api/viewer` | Check browser console; allowlist in `src/app/api/viewer/route.ts` may need adjustment |
| Training succeeds but `splat_size_bytes` is null | Old client cached | Hard refresh dashboard; the webhook update is server-authoritative |

## Cost monitoring

RunPod bills per-second of worker uptime. Per scene:
- ~15 min × RTX 4090 ($0.00075/sec) ≈ **$0.68/scene worst case**, typically **$0.30–$0.40**

Set a billing alert at RunPod Console → Billing → Set alert at $50/$100/$500 thresholds.
