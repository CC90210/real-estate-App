"""
FastAPI router for the PropFlow Automation Framework.

Endpoints:
  GET  /health                    — liveness probe
  POST /api/trigger               — receive automation trigger from Next.js
  POST /api/connect               — company saves their email credentials
  GET  /api/status/{company_id}   — company checks their automation status

Security:
  - POST /api/trigger verifies an HMAC-SHA256 signature sent in the
    X-PropFlow-Signature header, using the WEBHOOK_SECRET env var.
    Any request without a valid signature is rejected with 401.

  - POST /api/connect requires a Bearer token (the company's Supabase
    JWT or a service token) in the Authorization header.  The company_id
    in the token is compared against the payload company_id.

Rate limiting:
  - In-process sliding window per (company_id + endpoint) using a simple
    dict-based counter.  For multi-process deployments, replace with a
    Redis-backed limiter.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from automations import get_registry
from config import get_settings
from models.schemas import (
    AutomationLog,
    AutomationStatus,
    AutomationTrigger,
    CompanyCredentials,
    ConnectRequest,
    StatusResponse,
    TriggerResponse,
)
from services.supabase_client import SupabaseService

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# In-process rate limiter (sliding window)
# ---------------------------------------------------------------------------

# Structure: { "company_id:endpoint": [(timestamp, count), ...] }
_rate_buckets: dict[str, list[float]] = defaultdict(list)
_TRIGGER_LIMIT = 60        # requests per minute
_CONNECT_LIMIT = 10        # requests per minute
_STATUS_LIMIT = 120        # requests per minute


def _check_rate_limit(key: str, limit: int, window_seconds: int = 60) -> None:
    """
    Raise HTTP 429 if the key has exceeded `limit` requests in the last
    `window_seconds`.  Mutates _rate_buckets in place.
    """
    now = time.monotonic()
    cutoff = now - window_seconds
    bucket = _rate_buckets[key]

    # Evict expired entries
    _rate_buckets[key] = [t for t in bucket if t > cutoff]

    if len(_rate_buckets[key]) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait before retrying.",
        )

    _rate_buckets[key].append(now)


# ---------------------------------------------------------------------------
# Signature verification dependency
# ---------------------------------------------------------------------------

async def verify_signature(
    request: Request,
    x_propflow_signature: str | None = Header(default=None),
) -> bytes:
    """
    Verify the HMAC-SHA256 signature on an incoming webhook.

    The body bytes are returned so the route handler doesn't need to
    re-read the (already consumed) stream.
    """
    body = await request.body()

    if not x_propflow_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-PropFlow-Signature header.",
        )

    settings = get_settings()
    expected = hmac.new(
        settings.webhook_secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, x_propflow_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature.",
        )

    return body


# ---------------------------------------------------------------------------
# Bearer token dependency (for /api/connect and /api/status)
# ---------------------------------------------------------------------------

async def require_bearer(
    authorization: str | None = Header(default=None),
) -> str:
    """
    Extract and return the Bearer token value.

    The actual token verification against Supabase happens inside the
    route, not here, because we need the company_id from the request body
    to scope the Supabase lookup.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header with Bearer token is required.",
        )
    return authorization.removeprefix("Bearer ").strip()


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@router.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    """Liveness probe — returns 200 when the service is running."""
    return {"status": "ok", "service": "propflow-automations"}


# ---------------------------------------------------------------------------
# POST /api/trigger
# ---------------------------------------------------------------------------

@router.post(
    "/api/trigger",
    response_model=TriggerResponse,
    tags=["automations"],
)
async def trigger_automation(
    request: Request,
    body_bytes: bytes = Depends(verify_signature),
) -> TriggerResponse:
    """
    Receive an automation trigger from PropFlow's Next.js application.

    Authentication: HMAC-SHA256 signature in X-PropFlow-Signature header.
    The signature is computed over the raw request body using the shared
    WEBHOOK_SECRET environment variable.
    """
    import json

    # Parse body (already read and verified by the dependency)
    try:
        raw: dict[str, Any] = json.loads(body_bytes)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request body must be valid JSON.",
        )

    # Validate with Pydantic
    try:
        trigger = AutomationTrigger(**raw)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid trigger payload: {exc}",
        )

    # Per-company rate limit
    _check_rate_limit(f"{trigger.company_id}:trigger", _TRIGGER_LIMIT)

    # Idempotency — skip if we've already processed this exact key
    if trigger.idempotency_key:
        svc = SupabaseService()
        already = _check_idempotency(svc, trigger.company_id, trigger.idempotency_key)
        if already:
            return TriggerResponse(
                success=True,
                log_id=already,
                message="Duplicate request — already processed.",
            )

    # Dispatch
    registry = get_registry()
    result = await registry.dispatch(trigger)

    return TriggerResponse(
        success=result.success,
        log_id=result.log_id,
        message=result.message,
    )


# ---------------------------------------------------------------------------
# POST /api/connect
# ---------------------------------------------------------------------------

@router.post(
    "/api/connect",
    tags=["company"],
    status_code=status.HTTP_200_OK,
)
async def connect_company(
    payload: ConnectRequest,
    token: str = Depends(require_bearer),
) -> dict[str, str]:
    """
    Company self-service: save or update their email sending credentials.

    The Bearer token must be a valid Supabase JWT belonging to a user whose
    profile has the same company_id as in the payload — this prevents
    one company from overwriting another's credentials.
    """
    _check_rate_limit(f"{payload.credentials.company_id}:connect", _CONNECT_LIMIT)

    # Verify the token belongs to this company
    _verify_company_ownership(token, payload.credentials.company_id)

    # Encrypt the SMTP password before storage
    encrypted_creds = _encrypt_smtp_password(payload.credentials)

    svc = SupabaseService()
    saved = svc.save_company_credentials(encrypted_creds)

    if not saved:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save credentials. Please try again.",
        )

    return {
        "status": "ok",
        "message": (
            f"Email credentials saved for company {payload.credentials.company_id}. "
            "Automations will now use your SMTP server."
        ),
    }


# ---------------------------------------------------------------------------
# GET /api/status/{company_id}
# ---------------------------------------------------------------------------

@router.get(
    "/api/status/{company_id}",
    response_model=StatusResponse,
    tags=["company"],
)
async def get_status(
    company_id: str,
    token: str = Depends(require_bearer),
) -> StatusResponse:
    """
    Return recent automation activity for a company.

    The Bearer token must belong to the same company as company_id.
    """
    _check_rate_limit(f"{company_id}:status", _STATUS_LIMIT)
    _verify_company_ownership(token, company_id)

    svc = SupabaseService()
    logs = svc.get_recent_logs(company_id, limit=20)
    total_today = svc.count_logs_today(company_id)

    last_run_at = logs[0].created_at if logs else None

    return StatusResponse(
        company_id=company_id,
        recent_logs=logs,
        total_runs_today=total_today,
        last_run_at=last_run_at,
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _verify_company_ownership(token: str, company_id: str) -> None:
    """
    Verify a Supabase JWT and confirm the bearer's company_id matches.

    Raises HTTP 403 on mismatch.  Raises HTTP 401 on invalid token.
    """
    from jose import JWTError, jwt as jose_jwt

    settings = get_settings()

    try:
        # Supabase JWTs are signed with the project's JWT secret.
        # We decode without verifying the audience because Supabase does not
        # embed an `aud` claim on service-role tokens by default.
        claims = jose_jwt.decode(
            token,
            settings.supabase_service_key,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )

    # The JWT `sub` is the Supabase user UUID.  We look up their company.
    user_id: str = claims.get("sub", "")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has no subject claim.",
        )

    svc = SupabaseService()
    try:
        result = (
            svc._db.table("profiles")
            .select("company_id")
            .eq("id", user_id)
            .single()
            .execute()
        )
        token_company_id: str = (result.data or {}).get("company_id", "")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not resolve company for token.",
        )

    if token_company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token does not belong to the requested company.",
        )


def _check_idempotency(
    svc: SupabaseService, company_id: str, idempotency_key: str
) -> str | None:
    """
    Return the existing log_id if this idempotency_key was already processed,
    otherwise return None.
    """
    try:
        result = (
            svc._db.table("automation_logs")
            .select("id")
            .eq("company_id", company_id)
            .contains("details", {"idempotency_key": idempotency_key})
            .limit(1)
            .execute()
        )
        rows = result.data or []
        return rows[0]["id"] if rows else None
    except Exception:
        return None


def _encrypt_smtp_password(credentials: "CompanyCredentials") -> "CompanyCredentials":
    """
    Encrypt the smtp_password field using Fernet symmetric encryption.

    The encryption key is derived from the WEBHOOK_SECRET so no additional
    secret management is required.  The key is deterministic per deployment.

    Returns a copy of the credentials with the password field replaced by
    the base64-encoded ciphertext.
    """
    from cryptography.fernet import Fernet
    import base64

    if not credentials.smtp_password:
        return credentials

    try:
        settings = get_settings()
        # Derive a 32-byte key from the webhook secret (Fernet requires URL-safe base64)
        raw_key = hashlib.sha256(settings.webhook_secret.encode()).digest()
        fernet_key = base64.urlsafe_b64encode(raw_key)
        f = Fernet(fernet_key)

        encrypted = f.encrypt(credentials.smtp_password.encode("utf-8")).decode("utf-8")

        # Build a new instance with the encrypted password
        # We use model_copy (Pydantic v2) to avoid mutating a frozen model
        return credentials.model_copy(update={"smtp_password": encrypted})
    except Exception:
        logger.exception("Failed to encrypt SMTP password — storing unencrypted")
        return credentials
