"""
Follow-Up Automation

Triggered by: FOLLOW_UP_DUE

Implements Joseph's rules:
  - Wait minimum 2 hours of inactivity before the first follow-up
  - Maximum 2 follow-ups per day (per lead)
  - Messages are brief and human-like — no corporate spam language
  - No double texting — check previous automation_logs before sending

Required payload keys:
  - lead_id         (str) — UUID of the lead row
  - lead_email      (str) — email address to follow up with
  - lead_name       (str) — lead's first or full name
  - last_activity   (str) — ISO timestamp of the last interaction with this lead

Optional payload keys:
  - message         (str) — custom follow-up message; a default is used if absent
  - property_id     (str) — associated property UUID for context
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from automations.base import BaseAutomation
from config import get_settings
from models.schemas import AutomationResult, AutomationTrigger
from services.email_service import EmailMessage, EmailService
from services.supabase_client import SupabaseService

logger = logging.getLogger(__name__)

_DEFAULT_MESSAGES = [
    "Just wanted to check in — are you still interested in viewing the property? "
    "Happy to find a time that works for you.",
    "Hi there, I wanted to follow up on your inquiry. "
    "Please let me know if you have any questions or would like to book a showing.",
]


class FollowUpAutomation(BaseAutomation):
    automation_type = "follow_up"

    def __init__(self) -> None:
        super().__init__()
        self._email_svc = EmailService()
        self._settings = get_settings()

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate(self, trigger: AutomationTrigger) -> bool:
        return self._require_payload_keys(
            trigger,
            "lead_id",
            "lead_email",
            "lead_name",
            "last_activity",
        )

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    async def _run(self, trigger: AutomationTrigger) -> AutomationResult:
        p = trigger.payload
        company_id = trigger.company_id
        lead_id: str = p["lead_id"]
        lead_email: str = p["lead_email"].strip()
        lead_name: str = p["lead_name"].strip()
        last_activity_str: str = p["last_activity"]
        custom_message: str | None = p.get("message")

        # ------------------------------------------------------------------
        # Rule 1: Minimum inactivity window
        # ------------------------------------------------------------------
        try:
            last_activity = datetime.fromisoformat(
                last_activity_str.replace("Z", "+00:00")
            )
        except ValueError:
            return AutomationResult(
                success=False,
                automation_type=self.automation_type,
                company_id=company_id,
                message=f"Invalid last_activity timestamp: {last_activity_str!r}",
            )

        now = datetime.now(timezone.utc)
        inactivity = now - last_activity
        min_inactivity = timedelta(
            hours=self._settings.follow_up_min_inactivity_hours
        )

        if inactivity < min_inactivity:
            hours_remaining = (min_inactivity - inactivity).seconds // 3600
            return AutomationResult(
                success=True,
                automation_type=self.automation_type,
                company_id=company_id,
                message=(
                    f"Follow-up skipped: only {inactivity.seconds // 3600}h of inactivity "
                    f"(minimum {self._settings.follow_up_min_inactivity_hours}h). "
                    f"Retry in ~{hours_remaining}h."
                ),
                details={"skipped_reason": "inactivity_window_not_met", "lead_id": lead_id},
            )

        # ------------------------------------------------------------------
        # Rule 2: Maximum follow-ups per day
        # ------------------------------------------------------------------
        todays_follow_ups = self._svc.count_follow_ups_today(lead_id, company_id)
        max_per_day = self._settings.follow_up_max_per_day

        if todays_follow_ups >= max_per_day:
            return AutomationResult(
                success=True,
                automation_type=self.automation_type,
                company_id=company_id,
                message=(
                    f"Follow-up skipped: {todays_follow_ups}/{max_per_day} already "
                    "sent today for this lead."
                ),
                details={"skipped_reason": "daily_limit_reached", "lead_id": lead_id},
            )

        # ------------------------------------------------------------------
        # Rule 3: No double texting — check most recent follow-up log
        # ------------------------------------------------------------------
        if self._already_sent_today(lead_id, company_id):
            return AutomationResult(
                success=True,
                automation_type=self.automation_type,
                company_id=company_id,
                message="Follow-up skipped: already sent today (no double texting).",
                details={"skipped_reason": "no_double_texting", "lead_id": lead_id},
            )

        # ------------------------------------------------------------------
        # Step 4: Choose message — use custom if provided, else rotate defaults
        # ------------------------------------------------------------------
        message = custom_message or _DEFAULT_MESSAGES[todays_follow_ups % len(_DEFAULT_MESSAGES)]

        # ------------------------------------------------------------------
        # Step 5: Render and send
        # ------------------------------------------------------------------
        company_name = self._resolve_company_name(company_id)

        html = self._email_svc.render_follow_up(
            company_name=company_name,
            lead_name=lead_name.split()[0],  # First name only — more human
            follow_up_message=message,
        )

        ok, detail = await self._email_svc.send(
            company_id,
            EmailMessage(
                to=lead_email,
                subject=f"Checking In — {company_name}",
                html=html,
            ),
        )

        if ok:
            return AutomationResult(
                success=True,
                automation_type=self.automation_type,
                company_id=company_id,
                message=f"Follow-up sent to {lead_email}",
                details={
                    "lead_id": lead_id,
                    "follow_ups_today": todays_follow_ups + 1,
                    "send_detail": detail,
                },
            )
        else:
            return AutomationResult(
                success=False,
                automation_type=self.automation_type,
                company_id=company_id,
                message=f"Follow-up email failed: {detail}",
                details={"lead_id": lead_id, "send_detail": detail},
            )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _already_sent_today(self, lead_id: str, company_id: str) -> bool:
        """
        Return True if a follow-up was already logged as successful today
        for this lead, preventing double-sends within the same day.
        """
        try:
            from models.schemas import AutomationStatus

            today = datetime.now(timezone.utc).date().isoformat()
            result = (
                self._svc._db.table("automation_logs")
                .select("id", count="exact")
                .eq("company_id", company_id)
                .eq("automation_type", "follow_up")
                .eq("status", AutomationStatus.SUCCESS.value)
                .gte("created_at", f"{today}T00:00:00Z")
                .contains("details", {"lead_id": lead_id})
                .execute()
            )
            return (result.count or 0) > 0
        except Exception:
            # Err on the side of caution — don't send if we can't verify
            logger.exception(
                "Could not verify follow-up history for lead_id=%s", lead_id
            )
            return True

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
