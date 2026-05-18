from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import boto3
from botocore.client import BaseClient
from botocore.config import Config


def _required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} is not configured")
    return value


def _client() -> BaseClient:
    account_id = _required_env("R2_ACCOUNT_ID")
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=_required_env("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=_required_env("R2_SECRET_ACCESS_KEY"),
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def _safe_relative_path(prefix: str, key: str) -> Path:
    relative = key[len(prefix) :].lstrip("/")
    if not relative:
        relative = Path(key).name
    relative_path = Path(relative)
    if relative_path.is_absolute() or ".." in relative_path.parts:
        raise ValueError(f"Refusing unsafe R2 key path: {key}")
    return relative_path


def download_photos(bucket: str, prefix: str, dest_dir: str | Path) -> list[Path]:
    destination = Path(dest_dir)
    destination.mkdir(parents=True, exist_ok=True)

    client = _client()
    paginator = client.get_paginator("list_objects_v2")
    downloaded: list[Path] = []

    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for item in page.get("Contents", []):
            key = str(item.get("Key", ""))
            if not key or key.endswith("/"):
                continue

            relative_path = _safe_relative_path(prefix, key)
            file_path = destination / relative_path
            file_path.parent.mkdir(parents=True, exist_ok=True)
            client.download_file(bucket, key, str(file_path))
            downloaded.append(file_path)

    if not downloaded:
        raise RuntimeError(f"No photos found under r2://{bucket}/{prefix}")

    return downloaded


def upload_splat(bucket: str, key: str, file_path: str | Path) -> int:
    splat_path = Path(file_path)
    if not splat_path.is_file():
        raise FileNotFoundError(f"Splat file does not exist: {splat_path}")

    size_bytes = splat_path.stat().st_size
    extra_args: dict[str, Any] = {"ContentType": "application/octet-stream"}
    _client().upload_file(str(splat_path), bucket, key, ExtraArgs=extra_args)
    return size_bytes


def delete_photos(bucket: str, prefix: str) -> int:
    """Delete every R2 object under the given prefix.

    Called after successful training to free storage — the .ply output is the
    only artifact we need to keep; the source photos are no longer useful and
    their cumulative size dominates per-job storage cost (~200 MB photos vs
    ~150 MB splat per scene).

    Returns the count of objects deleted. Best-effort: failures are logged but
    don't raise (training succeeded, we don't want to mark the job failed for
    a cleanup hiccup).
    """
    client = _client()
    paginator = client.get_paginator("list_objects_v2")
    deleted = 0

    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        contents = page.get("Contents", []) or []
        if not contents:
            continue
        # S3 batch-delete: up to 1000 objects per request
        objects = [{"Key": str(item["Key"])} for item in contents if item.get("Key")]
        for i in range(0, len(objects), 1000):
            batch = objects[i:i + 1000]
            try:
                client.delete_objects(Bucket=bucket, Delete={"Objects": batch, "Quiet": True})
                deleted += len(batch)
            except Exception:
                # Swallow — training succeeded, this is just cleanup
                pass

    return deleted
