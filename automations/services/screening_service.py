"""
SingleKey screening integration helpers.

SingleKey is the tenant screening provider used by PropFlow. This service
handles outbound calls to their API when an application includes a screening
URL or order ID. All calls are fire-and-forget from the automation's
perspective; the screening webhook notifies PropFlow's Next.js app when
the report is ready.

Environment variables expected (all optional — screening is skipped when absent):
  SINGLEKEY_API_KEY   — the company-level or account-level API key
  SINGLEKEY_BASE_URL  — defaults to https://api.singlekey.ca/v1

Per-company keys can also be stored in automation_settings under the
`singlekey_api_key` column so that each company uses their own credentials.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

import httpx

from services.supabase_client import SupabaseService

logger = logging.getLogger(__name__)

_DEFAULT_BASE_URL = "https://api.singlekey.ca/v1"


class ScreeningService:
    """
    Wraps SingleKey API calls related to tenant screening.
    """

    def __init__(self) -> None:
        self._svc = SupabaseService()
        self._default_api_key: Optional[str] = os.getenv("SINGLEKEY_API_KEY")
        self._base_url: str = os.getenv(
            "SINGLEKEY_BASE_URL", _DEFAULT_BASE_URL
        ).rstrip("/")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def initiate_screening(
        self,
        company_id: str,
        application_id: str,
        applicant_email: str,
        applicant_name: str,
        property_address: str,
        screening_url: Optional[str] = None,
    ) -> tuple[bool, str]:
        """
        Initiate a tenant screening request via SingleKey.

        If `screening_url` is already provided in the application payload,
        we treat it as a self-service link and record it rather than making
        a new API call.

        Returns (success, detail_message).
        """
        api_key = self._resolve_api_key(company_id)

        if screening_url:
            # Application already has a screening URL — log and return
            logger.info(
                "Screening URL already present for application_id=%s, skipping initiation",
                application_id,
            )
            await self._record_screening_initiated(
                company_id=company_id,
                application_id=application_id,
                screening_url=screening_url,
                status="url_provided",
            )
            return True, f"Screening URL already present: {screening_url}"

        if not api_key:
            logger.info(
                "No SingleKey API key configured for company_id=%s — screening skipped",
                company_id,
            )
            return True, "Screening skipped: no SingleKey API key configured"

        payload = {
            "applicant_email": applicant_email,
            "applicant_name": applicant_name,
            "property_address": property_address,
            "reference_id": application_id,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{self._base_url}/screening-requests",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                )

            if response.status_code in (200, 201):
                data: dict[str, Any] = response.json()
                new_screening_url = data.get("screening_url") or data.get("url", "")
                await self._record_screening_initiated(
                    company_id=company_id,
                    application_id=application_id,
                    screening_url=new_screening_url,
                    status="initiated",
                )
                return True, f"Screening initiated. URL: {new_screening_url}"
            else:
                error_text = response.text[:500]
                logger.warning(
                    "SingleKey returned HTTP %d for application_id=%s: %s",
                    response.status_code,
                    application_id,
                    error_text,
                )
                return (
                    False,
                    f"SingleKey error {response.status_code}: {error_text}",
                )

        except httpx.TimeoutException:
            return False, "SingleKey API timed out"
        except Exception as exc:
            logger.exception(
                "Unexpected error initiating screening for application_id=%s",
                application_id,
            )
            return False, f"Screening error: {exc}"

    async def get_screening_report(
        self,
        company_id: str,
        screening_order_id: str,
    ) -> Optional[dict[str, Any]]:
        """
        Retrieve a completed screening report by order ID.

        Returns the report dict on success, or None on any failure.
        """
        api_key = self._resolve_api_key(company_id)
        if not api_key:
            return None

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self._base_url}/screening-reports/{screening_order_id}",
                    headers={"Authorization": f"Bearer {api_key}"},
                )

            if response.status_code == 200:
                return response.json()

            logger.warning(
                "SingleKey report fetch HTTP %d for order_id=%s",
                response.status_code,
                screening_order_id,
            )
            return None
        except Exception:
            logger.exception(
                "Error fetching screening report order_id=%s", screening_order_id
            )
            return None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _resolve_api_key(self, company_id: str) -> Optional[str]:
        """
        Attempt to load a per-company SingleKey API key from automation_settings.
        Falls back to the environment-level key.
        """
        try:
            result = (
                self._svc._db.table("automation_settings")
                .select("singlekey_api_key")
                .eq("company_id", company_id)
                .single()
                .execute()
            )
            per_company_key = (result.data or {}).get("singlekey_api_key")
            if per_company_key:
                return per_company_key
        except Exception:
            pass  # Fall through to environment default

        return self._default_api_key

    async def _record_screening_initiated(
        self,
        company_id: str,
        application_id: str,
        screening_url: str,
        status: str,
    ) -> None:
        """Update the application row and write an automation log."""
        try:
            self._svc._db.table("applications").update(
                {"screening_url": screening_url, "screening_status": status}
            ).eq("id", application_id).execute()
        except Exception:
            logger.warning(
                "Could not update screening_url on application_id=%s", application_id
            )

        from models.schemas import AutomationStatus

        self._svc.save_automation_log(
            company_id=company_id,
            automation_type="screening_initiation",
            status=AutomationStatus.SUCCESS,
            details={
                "application_id": application_id,
                "screening_url": screening_url,
                "screening_status": status,
            },
        )
