"""
Pydantic v2 schemas for the PropFlow Automation Framework.

Every model validates its own data on construction, making it impossible
for malformed payloads to reach business logic.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class AutomationStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


class AutomationEventType(str, Enum):
    # Application lifecycle
    APPLICATION_SUBMITTED = "APPLICATION_SUBMITTED"
    APPLICATION_STATUS_CHANGED = "APPLICATION_STATUS_CHANGED"

    # Document lifecycle
    DOCUMENT_SEND = "DOCUMENT_SEND"
    LEASE_GENERATED = "LEASE_GENERATED"

    # Lead lifecycle
    LEAD_CREATED = "LEAD_CREATED"
    FOLLOW_UP_DUE = "FOLLOW_UP_DUE"

    # Listing lifecycle
    LISTING_PUBLISHED = "LISTING_PUBLISHED"

    # Payment lifecycle
    INVOICE_CREATED = "INVOICE_CREATED"
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED"

    # Maintenance
    MAINTENANCE_REQUESTED = "MAINTENANCE_REQUESTED"


class EmailProvider(str, Enum):
    SMTP = "smtp"
    RESEND = "resend"
    GMAIL = "gmail"


# ---------------------------------------------------------------------------
# Core request / response models
# ---------------------------------------------------------------------------

class AutomationTrigger(BaseModel):
    """
    Payload sent from PropFlow's Next.js app to POST /api/trigger.

    The `event_type` drives which automation handler is invoked.
    The `payload` is a flexible dict; each handler validates the fields
    it actually needs rather than forcing a single rigid schema.
    """

    event_type: AutomationEventType
    company_id: str = Field(..., min_length=1)
    payload: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    idempotency_key: Optional[str] = Field(
        default=None,
        description="Caller-supplied key to prevent duplicate processing.",
    )

    @field_validator("company_id")
    @classmethod
    def company_id_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("company_id must not be blank")
        return v.strip()


class AutomationResult(BaseModel):
    """Returned by every automation handler after execution."""

    success: bool
    automation_type: str
    company_id: str
    log_id: Optional[str] = None
    message: str = ""
    details: Optional[dict[str, Any]] = None
    executed_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Company credential management
# ---------------------------------------------------------------------------

class CompanyCredentials(BaseModel):
    """
    Company self-service email configuration, stored encrypted in Supabase.

    Passwords are write-only — they are never returned in API responses
    (enforced by the `exclude` annotation on serialisation helpers).
    """

    company_id: str = Field(..., min_length=1)
    email_provider: EmailProvider = EmailProvider.SMTP
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = Field(default=587, ge=1, le=65535)
    smtp_user: Optional[str] = None
    # Never serialised back to the caller — stored encrypted, never echoed
    smtp_password: Optional[str] = Field(default=None, exclude=True)
    from_name: str = Field(..., min_length=1)
    from_email: str  # validated as email below

    @field_validator("from_email")
    @classmethod
    def validate_from_email(cls, v: str) -> str:
        # Basic check — EmailStr validator from pydantic-email-validator is
        # opt-in; we do a simple manual check to avoid hard dependency.
        v = v.strip()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError(f"Invalid from_email: {v!r}")
        return v

    @model_validator(mode="after")
    def smtp_fields_required_when_smtp(self) -> "CompanyCredentials":
        if self.email_provider in (EmailProvider.SMTP, EmailProvider.GMAIL):
            missing = [
                f for f in ("smtp_host", "smtp_user", "smtp_password")
                if not getattr(self, f)
            ]
            if missing:
                raise ValueError(
                    f"SMTP provider requires: {', '.join(missing)}"
                )
        return self


# ---------------------------------------------------------------------------
# Document sending
# ---------------------------------------------------------------------------

class DocumentSendRequest(BaseModel):
    """Request to send a document/lease PDF to a tenant."""

    company_id: str = Field(..., min_length=1)
    document_id: str = Field(..., min_length=1)
    recipient_email: str
    recipient_name: str = Field(..., min_length=1)
    # Signed Supabase Storage URL — valid for the duration of the task
    document_url: str = Field(..., min_length=1)
    subject: Optional[str] = None
    message: Optional[str] = None

    @field_validator("recipient_email")
    @classmethod
    def validate_recipient_email(cls, v: str) -> str:
        v = v.strip()
        if "@" not in v:
            raise ValueError(f"Invalid recipient_email: {v!r}")
        return v


# ---------------------------------------------------------------------------
# Automation log (mirrors automation_logs table)
# ---------------------------------------------------------------------------

class AutomationLog(BaseModel):
    """Read model for an automation_logs row."""

    id: Optional[str] = None
    company_id: str
    automation_type: str
    status: AutomationStatus
    details: Optional[dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# API-level request/response wrappers
# ---------------------------------------------------------------------------

class ConnectRequest(BaseModel):
    """
    POST /api/connect body.

    Used by company admins to save their email credentials so all automations
    send from their own address rather than PropFlow's Resend fallback.
    """

    credentials: CompanyCredentials


class TriggerResponse(BaseModel):
    success: bool
    log_id: Optional[str] = None
    message: str


class StatusResponse(BaseModel):
    company_id: str
    recent_logs: list[AutomationLog]
    total_runs_today: int
    last_run_at: Optional[datetime] = None
