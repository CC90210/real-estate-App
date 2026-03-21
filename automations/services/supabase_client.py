"""
Supabase service-role client and typed data-access helpers.

The service-role key bypasses Row Level Security so this module MUST only
be called from server-side automation code, never from any public-facing
endpoint that could leak data across companies.

Every helper that reads data accepts a company_id and enforces it in the
query so that accidental cross-company reads produce empty results rather
than an exception, giving a clear, auditable failure mode.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Optional

from supabase import Client, create_client

from config import get_settings
from models.schemas import AutomationLog, AutomationStatus, CompanyCredentials

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Singleton client
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Return the shared Supabase service-role client (created once)."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


# ---------------------------------------------------------------------------
# Data-access service
# ---------------------------------------------------------------------------

class SupabaseService:
    """
    Typed wrappers around raw Supabase queries.

    All methods accept a company_id wherever the data is company-scoped,
    ensuring no method can accidentally return another company's data.
    """

    def __init__(self) -> None:
        self._db: Client = get_supabase()

    # ------------------------------------------------------------------
    # Company credentials
    # ------------------------------------------------------------------

    def get_company_credentials(
        self, company_id: str
    ) -> Optional[CompanyCredentials]:
        """
        Load email credentials from automation_settings for the given company.

        Returns None when the company has not yet configured their credentials,
        which causes the email service to fall back to the Resend API.
        """
        try:
            result = (
                self._db.table("automation_settings")
                .select(
                    "company_id, email_provider, smtp_host, smtp_port, "
                    "smtp_user, smtp_password, from_name, from_email"
                )
                .eq("company_id", company_id)
                .single()
                .execute()
            )
            if not result.data:
                return None

            row = result.data
            return CompanyCredentials(
                company_id=row["company_id"],
                email_provider=row.get("email_provider", "smtp"),
                smtp_host=row.get("smtp_host"),
                smtp_port=row.get("smtp_port", 587),
                smtp_user=row.get("smtp_user"),
                smtp_password=row.get("smtp_password"),
                from_name=row.get("from_name", "PropFlow"),
                from_email=row.get("from_email", "noreply@propflow.app"),
            )
        except Exception:
            logger.exception(
                "Failed to load company credentials for company_id=%s", company_id
            )
            return None

    def save_company_credentials(
        self, credentials: CompanyCredentials
    ) -> bool:
        """
        Upsert a company's email credentials into automation_settings.

        The smtp_password is stored as-is here; the caller is responsible
        for encrypting it before passing it in.
        """
        try:
            data = {
                "company_id": credentials.company_id,
                "email_provider": credentials.email_provider.value,
                "smtp_host": credentials.smtp_host,
                "smtp_port": credentials.smtp_port,
                "smtp_user": credentials.smtp_user,
                "smtp_password": credentials.smtp_password,
                "from_name": credentials.from_name,
                "from_email": credentials.from_email,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            self._db.table("automation_settings").upsert(
                data, on_conflict="company_id"
            ).execute()
            return True
        except Exception:
            logger.exception(
                "Failed to save credentials for company_id=%s",
                credentials.company_id,
            )
            return False

    # ------------------------------------------------------------------
    # Automation logs
    # ------------------------------------------------------------------

    def save_automation_log(
        self,
        company_id: str,
        automation_type: str,
        status: AutomationStatus,
        details: Optional[dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> Optional[str]:
        """
        Insert a row into automation_logs and return the generated id.

        Returns None on failure — callers must not raise just because logging
        failed, since that would break the primary delivery path.
        """
        try:
            result = (
                self._db.table("automation_logs")
                .insert(
                    {
                        "company_id": company_id,
                        "automation_type": automation_type,
                        "status": status.value,
                        "details": details or {},
                        "error_message": error_message,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
                .execute()
            )
            rows = result.data or []
            return rows[0]["id"] if rows else None
        except Exception:
            logger.exception(
                "Failed to save automation log for company_id=%s type=%s",
                company_id,
                automation_type,
            )
            return None

    def update_automation_log_status(
        self,
        log_id: str,
        status: AutomationStatus,
        error_message: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Update an existing automation_logs row by id."""
        try:
            patch: dict[str, Any] = {"status": status.value}
            if error_message is not None:
                patch["error_message"] = error_message
            if details is not None:
                patch["details"] = details
            self._db.table("automation_logs").update(patch).eq(
                "id", log_id
            ).execute()
        except Exception:
            logger.exception("Failed to update automation log id=%s", log_id)

    def get_recent_logs(
        self, company_id: str, limit: int = 20
    ) -> list[AutomationLog]:
        """Return the most recent automation_logs rows for a company."""
        try:
            result = (
                self._db.table("automation_logs")
                .select("*")
                .eq("company_id", company_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            logs = []
            for row in result.data or []:
                try:
                    logs.append(
                        AutomationLog(
                            id=row.get("id"),
                            company_id=row["company_id"],
                            automation_type=row["automation_type"],
                            status=AutomationStatus(row["status"]),
                            details=row.get("details"),
                            error_message=row.get("error_message"),
                            created_at=row.get("created_at"),
                        )
                    )
                except Exception:
                    logger.warning("Skipping malformed log row id=%s", row.get("id"))
            return logs
        except Exception:
            logger.exception(
                "Failed to load recent logs for company_id=%s", company_id
            )
            return []

    def count_logs_today(self, company_id: str) -> int:
        """Return the number of automation runs recorded today for a company."""
        try:
            today = datetime.now(timezone.utc).date().isoformat()
            result = (
                self._db.table("automation_logs")
                .select("id", count="exact")
                .eq("company_id", company_id)
                .gte("created_at", f"{today}T00:00:00Z")
                .execute()
            )
            return result.count or 0
        except Exception:
            logger.exception(
                "Failed to count today's logs for company_id=%s", company_id
            )
            return 0

    # ------------------------------------------------------------------
    # Application data
    # ------------------------------------------------------------------

    def get_application(
        self, application_id: str, company_id: str
    ) -> Optional[dict[str, Any]]:
        """
        Fetch a single application row scoped to a specific company.

        The company_id filter prevents cross-company reads even if the
        service-role key could theoretically access any row.
        """
        try:
            result = (
                self._db.table("applications")
                .select("*, properties(*)")
                .eq("id", application_id)
                .eq("company_id", company_id)
                .single()
                .execute()
            )
            return result.data
        except Exception:
            logger.exception(
                "Failed to fetch application id=%s company_id=%s",
                application_id,
                company_id,
            )
            return None

    # ------------------------------------------------------------------
    # Document data
    # ------------------------------------------------------------------

    def get_document(
        self, document_id: str, company_id: str
    ) -> Optional[dict[str, Any]]:
        """Fetch a documents row scoped to a specific company."""
        try:
            result = (
                self._db.table("documents")
                .select("*")
                .eq("id", document_id)
                .eq("company_id", company_id)
                .single()
                .execute()
            )
            return result.data
        except Exception:
            logger.exception(
                "Failed to fetch document id=%s company_id=%s",
                document_id,
                company_id,
            )
            return None

    # ------------------------------------------------------------------
    # Lead / follow-up data
    # ------------------------------------------------------------------

    def get_lead(
        self, lead_id: str, company_id: str
    ) -> Optional[dict[str, Any]]:
        """Fetch a lead row scoped to a specific company."""
        try:
            result = (
                self._db.table("leads")
                .select("*")
                .eq("id", lead_id)
                .eq("company_id", company_id)
                .single()
                .execute()
            )
            return result.data
        except Exception:
            logger.exception(
                "Failed to fetch lead id=%s company_id=%s", lead_id, company_id
            )
            return None

    def count_follow_ups_today(
        self, lead_id: str, company_id: str
    ) -> int:
        """Count how many follow-up automations ran today for a specific lead."""
        try:
            today = datetime.now(timezone.utc).date().isoformat()
            result = (
                self._db.table("automation_logs")
                .select("id", count="exact")
                .eq("company_id", company_id)
                .eq("automation_type", "follow_up")
                .gte("created_at", f"{today}T00:00:00Z")
                .contains("details", {"lead_id": lead_id})
                .execute()
            )
            return result.count or 0
        except Exception:
            logger.exception(
                "Failed to count follow-ups for lead_id=%s", lead_id
            )
            return 0

    # ------------------------------------------------------------------
    # Property / listing data
    # ------------------------------------------------------------------

    def get_property(
        self, property_id: str, company_id: str
    ) -> Optional[dict[str, Any]]:
        """Fetch a property row scoped to a specific company."""
        try:
            result = (
                self._db.table("properties")
                .select("*, buildings(*), landlords(*)")
                .eq("id", property_id)
                .eq("company_id", company_id)
                .single()
                .execute()
            )
            return result.data
        except Exception:
            logger.exception(
                "Failed to fetch property id=%s company_id=%s",
                property_id,
                company_id,
            )
            return None

    def get_listing(
        self, listing_id: str, company_id: str
    ) -> Optional[dict[str, Any]]:
        """Fetch a listing row scoped to a specific company."""
        try:
            result = (
                self._db.table("listings")
                .select("*, properties(*)")
                .eq("id", listing_id)
                .eq("company_id", company_id)
                .single()
                .execute()
            )
            return result.data
        except Exception:
            logger.exception(
                "Failed to fetch listing id=%s company_id=%s",
                listing_id,
                company_id,
            )
            return None

    # ------------------------------------------------------------------
    # Rate-limit helper: emails sent in the last hour
    # ------------------------------------------------------------------

    def count_emails_last_hour(self, company_id: str) -> int:
        """
        Count successful email automation runs in the last 60 minutes
        for a company.  Used to enforce the per-company email rate limit.
        """
        try:
            from datetime import timedelta

            one_hour_ago = (
                datetime.now(timezone.utc) - timedelta(hours=1)
            ).isoformat()
            result = (
                self._db.table("automation_logs")
                .select("id", count="exact")
                .eq("company_id", company_id)
                .in_(
                    "automation_type",
                    ["document_sender", "application_processor", "follow_up"],
                )
                .eq("status", AutomationStatus.SUCCESS.value)
                .gte("created_at", one_hour_ago)
                .execute()
            )
            return result.count or 0
        except Exception:
            logger.exception(
                "Failed to count hourly emails for company_id=%s", company_id
            )
            return 0
