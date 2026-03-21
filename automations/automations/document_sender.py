"""
Document Sender Automation

Triggered by: DOCUMENT_SEND, LEASE_GENERATED

Workflow:
  1. Load document metadata from Supabase (company-scoped)
  2. Fetch PDF bytes from Supabase Storage via the signed URL
  3. Fetch company email credentials
  4. Send the PDF as an email attachment to the tenant
  5. Log delivery status

Required payload keys:
  - document_id      (str)  — UUID of the document row
  - recipient_email  (str)  — tenant's email address
  - recipient_name   (str)  — tenant's display name
  - document_url     (str)  — signed Supabase Storage URL (valid for >=1 hour)

Optional payload keys:
  - property_address (str)  — for email body context
  - agent_name       (str)  — displayed in the email as sender
  - message          (str)  — custom note from the agent
"""

from __future__ import annotations

import logging

from automations.base import BaseAutomation
from models.schemas import AutomationResult, AutomationTrigger
from services.document_service import DocumentService
from services.email_service import EmailMessage, EmailService
from services.supabase_client import SupabaseService

logger = logging.getLogger(__name__)


class DocumentSenderAutomation(BaseAutomation):
    automation_type = "document_sender"

    def __init__(self) -> None:
        super().__init__()
        self._email_svc = EmailService()
        self._doc_svc = DocumentService()

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate(self, trigger: AutomationTrigger) -> bool:
        return self._require_payload_keys(
            trigger,
            "document_id",
            "recipient_email",
            "recipient_name",
            "document_url",
        )

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    async def _run(self, trigger: AutomationTrigger) -> AutomationResult:
        p = trigger.payload
        company_id = trigger.company_id
        document_id: str = p["document_id"]
        recipient_email: str = p["recipient_email"].strip()
        recipient_name: str = p["recipient_name"].strip()
        document_url: str = p["document_url"].strip()

        # Optional context fields with sensible defaults
        property_address: str = p.get("property_address", "")
        agent_name: str = p.get("agent_name", "Your Agent")
        custom_message: str = p.get("message", "")

        # ------------------------------------------------------------------
        # Step 1: Load document metadata to get the title
        # ------------------------------------------------------------------
        document = self._svc.get_document(document_id, company_id)
        document_title: str = "Rental Document"

        if document:
            document_title = self._doc_svc.get_filename(document, "Rental Document")
            # Strip .pdf suffix for display
            if document_title.lower().endswith(".pdf"):
                document_title = document_title[:-4]
        else:
            logger.warning(
                "document_sender: document_id=%s not found in DB for company_id=%s; "
                "continuing with URL-only delivery",
                document_id,
                company_id,
            )

        # ------------------------------------------------------------------
        # Step 2: Fetch PDF bytes
        # ------------------------------------------------------------------
        pdf_bytes, fetch_error = await self._doc_svc.fetch_pdf_bytes(
            document_url=document_url,
            company_id=company_id,
            document_id=document_id,
        )

        attachments: list[tuple[bytes, str, str]] = []
        if pdf_bytes:
            filename = f"{document_title.replace(' ', '_')}.pdf"
            attachments.append((pdf_bytes, filename, "application/pdf"))
        else:
            logger.warning(
                "document_sender: Could not fetch PDF for document_id=%s: %s. "
                "Email will be sent without attachment.",
                document_id,
                fetch_error,
            )

        # ------------------------------------------------------------------
        # Step 3: Fetch company branding (company name for email header)
        # ------------------------------------------------------------------
        company_name = self._resolve_company_name(company_id)

        # ------------------------------------------------------------------
        # Step 4: Render and send email
        # ------------------------------------------------------------------
        html_body = self._email_svc.render_document_delivery(
            company_name=company_name,
            recipient_name=recipient_name,
            agent_name=agent_name,
            document_title=document_title,
            property_address=property_address or "your property",
            message=custom_message,
        )

        email = EmailMessage(
            to=recipient_email,
            subject=f"{document_title} — Please Review",
            html=html_body,
            attachments=attachments,
        )

        success, detail = await self._email_svc.send(company_id, email)

        if success:
            self._doc_svc.mark_delivered(document_id, company_id, recipient_email)
            return AutomationResult(
                success=True,
                automation_type=self.automation_type,
                company_id=company_id,
                message=f"Document '{document_title}' sent to {recipient_email}",
                details={
                    "document_id": document_id,
                    "recipient_email": recipient_email,
                    "had_attachment": bool(attachments),
                    "send_detail": detail,
                },
            )
        else:
            self._doc_svc.mark_failed(
                document_id, company_id, recipient_email, detail
            )
            return AutomationResult(
                success=False,
                automation_type=self.automation_type,
                company_id=company_id,
                message=f"Failed to send document: {detail}",
                details={"document_id": document_id, "send_detail": detail},
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
