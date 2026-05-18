from __future__ import annotations

import os
import shutil
import traceback
from pathlib import Path
from typing import Any, Mapping, Sequence, TypedDict, cast

import runpod

from pipeline.colmap_runner import run_colmap
from pipeline.gsplat_trainer import train
from pipeline.r2_io import delete_photos, download_photos, upload_splat
from pipeline.webhook import post_failed, post_progress, post_success


class HandlerInput(TypedDict):
    job_id: str
    bucket: str
    photo_keys: list[str]
    splat_key: str
    webhook_url: str
    webhook_secret_id: str
    photo_count: int


def _log(job_id: str, message: str) -> None:
    print(f"[{job_id}] {message}", flush=True)


def _require_str(input_data: Mapping[str, Any], key: str) -> str:
    value = input_data.get(key)
    if not isinstance(value, str) or not value:
        raise ValueError(f"input.{key} is required and must be a non-empty string")
    return value


def _parse_input(event: Mapping[str, Any]) -> HandlerInput:
    raw_input = event.get("input")
    if not isinstance(raw_input, Mapping):
        raise ValueError("RunPod event must include an input object")

    photo_keys = raw_input.get("photo_keys")
    if not isinstance(photo_keys, Sequence) or isinstance(photo_keys, (str, bytes)):
        raise ValueError("input.photo_keys must be a single-element list of R2 prefixes")

    parsed_photo_keys = [str(item) for item in photo_keys if str(item)]
    if len(parsed_photo_keys) != 1:
        raise ValueError("input.photo_keys must contain exactly one non-empty R2 prefix")

    photo_count_raw = raw_input.get("photo_count")
    if not isinstance(photo_count_raw, int) or photo_count_raw < 1:
        raise ValueError("input.photo_count is required and must be a positive integer")

    return {
        "job_id": _require_str(raw_input, "job_id"),
        "bucket": _require_str(raw_input, "bucket"),
        "photo_keys": parsed_photo_keys,
        "splat_key": _require_str(raw_input, "splat_key"),
        "webhook_url": _require_str(raw_input, "webhook_url"),
        "webhook_secret_id": _require_str(raw_input, "webhook_secret_id"),
        "photo_count": photo_count_raw,
    }


def _webhook_secret() -> str:
    secret = os.environ.get("WALKTHROUGH_WEBHOOK_SECRET")
    if not secret:
        raise RuntimeError("WALKTHROUGH_WEBHOOK_SECRET is not configured")
    return secret


def _require_webhook(ok: bool, event_name: str) -> None:
    if not ok:
        raise RuntimeError(f"Webhook POST for {event_name} did not return a 2xx response")


def handler(event: Mapping[str, Any]) -> dict[str, Any]:
    job_id = "unknown"
    webhook_url: str | None = None
    secret: str | None = os.environ.get("WALKTHROUGH_WEBHOOK_SECRET")

    try:
        input_data = _parse_input(event)
        job_id = input_data["job_id"]
        webhook_url = input_data["webhook_url"]
        secret = _webhook_secret()

        job_dir = Path("/tmp") / job_id
        photo_dir = job_dir / "photos"
        output_ply_path = job_dir / "scene.ply"

        if job_dir.exists():
            _log(job_id, f"Removing existing workspace at {job_dir}")
            shutil.rmtree(job_dir)
        photo_dir.mkdir(parents=True, exist_ok=True)

        prefix = input_data["photo_keys"][0]
        _log(job_id, f"Downloading photos from r2://{input_data['bucket']}/{prefix}")
        downloaded = download_photos(input_data["bucket"], prefix, photo_dir)
        if len(downloaded) != input_data["photo_count"]:
            raise RuntimeError(
                f"Expected {input_data['photo_count']} photos under {prefix}, downloaded {len(downloaded)}"
            )

        _require_webhook(post_progress(job_id, 5, webhook_url, secret), "progress:5")

        _log(job_id, "Running COLMAP sparse reconstruction")
        sparse_model_dir = run_colmap(photo_dir, job_dir)
        _require_webhook(post_progress(job_id, 25, webhook_url, secret), "progress:25")

        _log(job_id, "Running gsplat training")
        train(photo_dir, sparse_model_dir, output_ply_path)
        if not output_ply_path.exists():
            raise RuntimeError(f"gsplat training completed without producing {output_ply_path}")

        _require_webhook(post_progress(job_id, 90, webhook_url, secret), "progress:90")

        _log(job_id, f"Uploading splat to r2://{input_data['bucket']}/{input_data['splat_key']}")
        splat_size_bytes = upload_splat(input_data["bucket"], input_data["splat_key"], output_ply_path)
        _require_webhook(
            post_success(job_id, input_data["splat_key"], splat_size_bytes, webhook_url, secret),
            "succeeded",
        )

        # Cost control: photos are useless after the .ply is produced. Best-effort
        # delete — failures don't fail the job since training already succeeded.
        try:
            prefix = input_data["photo_keys"][0]
            deleted = delete_photos(input_data["bucket"], prefix)
            _log(job_id, f"Cleaned up {deleted} source photos from R2")
        except Exception as cleanup_err:
            _log(job_id, f"Photo cleanup skipped (non-fatal): {cleanup_err}")

        _log(job_id, f"Completed splat training with {splat_size_bytes} bytes")
        return {
            "ok": True,
            "job_id": job_id,
            "splat_r2_key": input_data["splat_key"],
            "splat_size_bytes": splat_size_bytes,
        }
    except Exception:
        error_message = traceback.format_exc()
        _log(job_id, f"FAILED\n{error_message}")
        if webhook_url and secret:
            post_failed(job_id, error_message, webhook_url, secret)
        return cast(dict[str, Any], {"ok": False, "job_id": job_id, "error_message": error_message})


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
