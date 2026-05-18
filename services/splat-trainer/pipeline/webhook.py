from __future__ import annotations

import hashlib
import hmac
import json
import urllib.error
import urllib.request
from typing import Any


def _log(job_id: str, message: str) -> None:
    print(f"[{job_id}] {message}", flush=True)


def _post(job_id: str, webhook_url: str, secret: str, body: dict[str, Any]) -> bool:
    payload = json.dumps(body, separators=(",", ":"), sort_keys=True)
    signature = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    request = urllib.request.Request(
        webhook_url,
        data=payload.encode(),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Walkthrough-Signature": signature,
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            status = response.getcode()
    except urllib.error.HTTPError as exc:
        _log(job_id, f"Webhook returned HTTP {exc.code} for event {body.get('event')}")
        return False
    except urllib.error.URLError as exc:
        _log(job_id, f"Webhook request failed for event {body.get('event')}: {exc}")
        return False

    ok = 200 <= status < 300
    if not ok:
        _log(job_id, f"Webhook returned HTTP {status} for event {body.get('event')}")
    return ok


def post_progress(job_id: str, progress_pct: int, webhook_url: str, secret: str) -> bool:
    return _post(
        job_id,
        webhook_url,
        secret,
        {"event": "progress", "progress_pct": progress_pct, "job_id": job_id},
    )


def post_success(
    job_id: str,
    splat_r2_key: str,
    splat_size_bytes: int,
    webhook_url: str,
    secret: str,
) -> bool:
    return _post(
        job_id,
        webhook_url,
        secret,
        {
            "event": "succeeded",
            "splat_r2_key": splat_r2_key,
            "splat_size_bytes": splat_size_bytes,
            "job_id": job_id,
        },
    )


def post_failed(job_id: str, error_message: str, webhook_url: str, secret: str) -> bool:
    return _post(
        job_id,
        webhook_url,
        secret,
        {"event": "failed", "error_message": error_message, "job_id": job_id},
    )
