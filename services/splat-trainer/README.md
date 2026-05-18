# PropFlow Splat Trainer

RunPod Serverless container for PropFlow walkthrough reconstruction. The handler downloads listing photos from Cloudflare R2, runs COLMAP sparse reconstruction, trains a 3D Gaussian Splat with the Apache-2 `nerfstudio-project/gsplat` stack, uploads `scene.ply` back to R2, and reports status to the PropFlow webhook.

## Files

- `handler.py` is the RunPod Serverless entrypoint.
- `pipeline/r2_io.py` handles Cloudflare R2 downloads and uploads.
- `pipeline/colmap_runner.py` runs COLMAP `feature_extractor`, `exhaustive_matcher`, and `mapper`.
- `pipeline/gsplat_trainer.py` runs the upstream gsplat `examples/simple_trainer.py` against the COLMAP capture and copies the exported PLY to `/tmp/<job_id>/scene.ply`.
- `pipeline/webhook.py` posts HMAC-signed progress, success, and failure events.

## Required Runtime Environment

Set these on the RunPod Serverless template:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `WALKTHROUGH_WEBHOOK_SECRET`

Optional:

- `GSPLAT_EXAMPLES_DIR`, defaults to `/opt/gsplat/examples`

The RunPod job input must match:

```json
{
  "input": {
    "job_id": "walkthrough-job-id",
    "bucket": "propflow-bucket",
    "photo_keys": ["walkthroughs/walkthrough-job-id/photos/"],
    "splat_key": "walkthroughs/walkthrough-job-id/scene.ply",
    "webhook_url": "https://propflow.example.com/api/walkthroughs/webhook",
    "webhook_secret_id": "default",
    "photo_count": 42
  }
}
```

## Local Build

From `C:\Users\User\realestate-App\services\splat-trainer`:

```powershell
docker build -t propflow-splat-trainer:local .
```

The Dockerfile builds COLMAP 3.10 from source and installs Python 3.11, PyTorch, gsplat, and the gsplat example trainer dependencies. Build time can be long because COLMAP and CUDA Python packages are large.

## Local Smoke Test

Use a small R2 prefix and a test webhook endpoint:

```powershell
docker run --rm --gpus all `
  -e R2_ACCOUNT_ID="$env:R2_ACCOUNT_ID" `
  -e R2_ACCESS_KEY_ID="$env:R2_ACCESS_KEY_ID" `
  -e R2_SECRET_ACCESS_KEY="$env:R2_SECRET_ACCESS_KEY" `
  -e WALKTHROUGH_WEBHOOK_SECRET="$env:WALKTHROUGH_WEBHOOK_SECRET" `
  propflow-splat-trainer:local
```

RunPod invokes the handler itself in production. For local direct handler testing, install `runpod` locally or use a short Python wrapper that imports `handler.handler()` and passes the sample JSON above.

## Publish Image

```powershell
docker tag propflow-splat-trainer:local ghcr.io/cc90210/propflow-splat-trainer:latest
docker push ghcr.io/cc90210/propflow-splat-trainer:latest
```

## RunPod Serverless Deployment

1. Create a RunPod Serverless endpoint.
2. Point the endpoint image at `ghcr.io/cc90210/propflow-splat-trainer:latest`.
3. Use a GPU worker with enough VRAM for gsplat training.
4. Add the required environment variables listed above.
5. Set the container command to the image default: `python -u handler.py`.
6. Dispatch PropFlow jobs with the contract shown in the sample input.

## Webhook Contract

Every webhook body is compact JSON signed with HMAC-SHA256 using `WALKTHROUGH_WEBHOOK_SECRET` and sent with:

```text
X-Walkthrough-Signature: <hex digest>
```

Events:

- Progress: `{"event":"progress","progress_pct":5,"job_id":"..."}`
- Success: `{"event":"succeeded","splat_r2_key":"...","splat_size_bytes":123,"job_id":"..."}`
- Failure: `{"event":"failed","error_message":"<traceback>","job_id":"..."}`

## License Notes

This container uses commercial-friendly OSS components:

- `nerfstudio-project/gsplat`, Apache-2.0
- COLMAP, BSD-3-Clause

It does not use Inria's non-commercial `graphdeco-inria/gaussian-splatting` implementation.
