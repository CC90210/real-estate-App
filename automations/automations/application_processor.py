"""
Application Processor Automation

Triggered by: APPLICATION_SUBMITTED

Workflow:
  1. Load application data from Supabase (company-scoped)
  2. Send a confirmation email to the applicant
  3. Send a notification email to the agent / landlord
  4. Initiate SingleKey tenant screening if applicable

Required payload keys:
  - application_id   (str) — UUID of the application row

Optional payload keys:
  - agent_email      (str) — override the agent's email for the notification
  - skip_screening   (bool) — set True to bypass SingleKey initiation
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from automations.base import BaseAutomation
from models.schemas import AutomationResult, AutomationTrigger
from services.email_service import EmailMessage, EmailService
from services.screening_service import ScreeningService
from services.supabase_client import SupabaseService

logger = logging.getLogger(__name__)


class ApplicationProcessorAutomation(BaseAutomation):
    automation_type = "application_processor"

    def __init__(self) -> None:
        super().__init__()
        self._email_svc = EmailService()
        self._screening_svc = ScreeningService()

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate(self, trigger: AutomationTrigger) -> bool:
        return self._require_payload_keys(trigger, "application_id")

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    async def _run(self, trigger: AutomationTrigger) -> AutomationResult:
        p = trigger.payload
        company_id = trigger.company_id
        application_id: str = p["application_id"]
        override_agent_email: str | None = p.get("agent_email")
        skip_screening: bool = bool(p.get("skip_screening", False))

        # ------------------------------------------------------------------
        # Step 1: Load application with property
        # ------------------------------------------------------------------
        application = self._svc.get_application(application_id, company_id)

        if not application:
            return AutomationResult(
                success=False,
                automation_type=self.automation_type,
                company_id=company_id,
                message=f"Application {application_id} not found for company {company_id}",
            )

        # Extract commonly needed fields with safe defaults
        applicant_name: str = (
            application.get("applicant_name")
            or application.get("first_name", "Applicant")
        )
        applicant_email: str = application.get("applicant_email", "")
        property_data: dict = application.get("properties") or {}
        property_address: str = (
            property_data.get("address")
            or application.get("property_address", "the property")
        )
        submitted_at: str = (
            application.get("created_at")
            or datetime.now(timezone.utc).isoformat()
        )

        company_name = self._resolve_company_name(company_id)
        results: list[str] = []

        # ------------------------------------------------------------------
        # Step 2: Applicant confirmation email
        # ------------------------------------------------------------------
        if applicant_email:
            html = self._email_svc.render_application_confirmation(
                company_name=company_name,
                applicant_name=applicant_name,
                property_address=property_address,
                submitted_at=_format_date(submitted_at),
                application_id=application_id[:8].upper(),
            )
            ok, detail = await self._email_svc.send(
                company_id,
                EmailMessage(
                    to=applicant_email,
                    subject=f"Application Received — {property_address}",
                    html=html,
                ),
            )
            results.append(f"Applicant confirmation: {'sent' if ok else 'FAILED — ' + detail}")
        else:
            results.append("Applicant confirmation: skipped (no email on application)")

        # ------------------------------------------------------------------
        # Step 3: Agent / landlord notification
        # ------------------------------------------------------------------
        agent_email = override_agent_email or self._resolve_agent_email(
            company_id, application
        )

        if agent_email:
            html = self._email_svc.render_agent_application_notification(
                company_name=company_name,
                applicant_name=applicant_name,
                applicant_email=applicant_email or "—",
                property_address=property_address,
                submitted_at=_format_date(submitted_at),
            )
            ok, detail = await self._email_svc.send(
                company_id,
                EmailMessage(
                    to=agent_email,
                    subject=f"New Application: {applicant_name} — {property_address}",
                    html=html,
                ),
            )
            results.append(f"Agent notification: {'sent' if ok else 'FAILED — ' + detail}")
        else:
            results.append("Agent notification: skipped (no agent email found)")

        # ------------------------------------------------------------------
        # Step 4: Screening
        # ------------------------------------------------------------------
        if not skip_screening:
            screening_url: str | None = application.get("screening_url")
            ok, detail = await self._screening_svc.initiate_screening(
                company_id=company_id,
                application_id=application_id,
                applicant_email=applicant_email or "",
                applicant_name=applicant_name,
                property_address=property_address,
                screening_url=screening_url,
            )
            results.append(f"Screening: {'initiated' if ok else 'FAILED — ' + detail}")
        else:
            results.append("Screening: skipped by caller")

        return AutomationResult(
            success=True,
            automation_type=self.automation_type,
            company_id=company_id,
            message=" | ".join(results),
            details={
                "application_id": application_id,
                "applicant_email": applicant_email,
                "steps": results,
            },
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _resolve_company_name(self, company_id: str) -> str:
        try:
            result = (
                self._svc._db.table("companies")
                .select("name")
                .eq("id", company_id)
                .single()
                .execute()
            )
            return (result.data or {}).get("name", "PropFlow")
        except Exception:
            return "PropFlow"

    def _resolve_agent_email(
        self, company_id: str, application: dict
    ) -> str | None:
        """
        Derive the agent's email from the application or the company's primary
        contact, whichever is available first.
        """
        # 1. Agent directly on the application
        agent_id: str | None = application.get("agent_id") or application.get(
            "assigned_to"
        )
        if agent_id:
            try:
                result = (
                    self._svc._db.table("profiles")
                    .select("email")
                    .eq("id", agent_id)
                    .single()
                    .execute()
                )
                email = (result.data or {}).get("email")
                if email:
                    return email
            except Exception:
                pass

        # 2. Company contact email
        try:
            result = (
                self._svc._db.table("companies")
                .select("email")
                .eq("id", company_id)
                .single()
                .execute()
            )
            return (result.data or {}).get("email")
        except Exception:
            return None


def _format_date(iso_str: str) -> str:
    """Convert an ISO timestamp to a human-readable date string."""
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return dt.strftime("%B %d, %Y at %I:%M %p UTC")
    except Exception:
        return iso_str
