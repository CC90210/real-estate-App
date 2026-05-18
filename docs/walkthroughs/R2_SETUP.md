# Cloudflare R2 — Bucket + CORS + API Token

One-time setup for the R2 bucket that backs walkthrough storage. ~5 minutes in the Cloudflare dashboard.

## 1. Create the bucket

1. Cloudflare dashboard → **R2** → **Create bucket**
2. Name: `propflow-splat-renders` (this exact name — it's the default in `R2_BUCKET`)
3. Location: leave as **Automatic**
4. **Do NOT enable public access.** All reads happen through PropFlow's signed-URL endpoints.

## 2. Configure CORS (required — browsers upload photos directly)

Photos go from the agent's browser → R2 via signed PUT URLs. Without CORS, the browser blocks the upload.

R2 dashboard → your bucket → **Settings** → **CORS Policy** → **Add CORS policy** → paste:

```json
[
  {
    "AllowedOrigins": [
      "https://propflow.pro",
      "https://*.propflow.pro",
      "https://real-estate-app-cc90210.vercel.app",
      "https://*.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**Why each origin:**
- `propflow.pro` + `*.propflow.pro` — production
- `*.vercel.app` — Vercel preview deployments
- `real-estate-app-cc90210.vercel.app` — explicit production Vercel URL (in case Vercel domain changes)
- `localhost:3000` — local dev

Click **Save**.

## 3. (Optional but recommended) Lifecycle rule for cleanup

The splat-trainer deletes source photos automatically after successful training, but adding a lifecycle rule belts-and-braces in case any orphan objects slip through (e.g. failed uploads, jobs that errored before the trainer ran).

R2 dashboard → your bucket → **Settings** → **Object lifecycle rules** → **Add rule**:

| Field | Value |
|---|---|
| Rule name | `purge-orphan-photos` |
| Prefix | `walkthroughs/` |
| Action | **Delete object** |
| After (days) | `7` |

(R2 will delete any object under `walkthroughs/` that hasn't been replaced/touched in 7 days. The `.ply` files get re-served constantly via signed URLs so they don't age out; only orphan photos do.)

## 4. Create the API token

Dashboard → **R2** → **Manage R2 API Tokens** → **Create API Token**

| Field | Value |
|---|---|
| Token name | `propflow-splat-renders-rw` |
| Permissions | **Object Read & Write** |
| Specify buckets | **Apply to specific buckets only** → `propflow-splat-renders` |
| TTL | **Forever** (or 1 year — your call) |

Click **Create API Token**. You'll see (shown ONLY once):
- **Access Key ID** → `R2_ACCESS_KEY_ID`
- **Secret Access Key** → `R2_SECRET_ACCESS_KEY`

You'll also need:
- **Account ID** — top-right corner of any R2 page (32-char hex) → `R2_ACCOUNT_ID`

## 5. Wire to PropFlow

Three places — they all need the same values:

**PropFlow `.env.local` (for local dev):**
```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=propflow-splat-renders
```

**PropFlow Vercel project (production/preview/development):**
Use `python scripts/vercel_env_tool.py set --project real-estate-app --key R2_ACCOUNT_ID --value <value> --env "production,preview,development"` for each of the three.

**RunPod endpoint (so the trainer can read photos + write the .ply):**
Pass these into the endpoint's env when running `python services/splat-trainer/scripts/deploy_runpod.py create`. The script reads them from local environment and registers them with RunPod's secret store — you never see the values transmitted.

## 6. Verify

Hit the health check endpoint once env vars are set:

```
curl https://propflow.pro/api/walkthroughs/health
```

You should see:
```json
{
  "status": "healthy",
  "checks": {
    "supabase": { "ok": true, "latency_ms": ~30 },
    "r2":       { "ok": true, "latency_ms": ~80 },
    "runpod":   { "ok": true, "latency_ms": ~150 },
    "webhook_secret": { "ok": true }
  }
}
```

Any `ok: false` tells you what's missing.
