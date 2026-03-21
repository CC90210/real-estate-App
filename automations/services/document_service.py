"""
Document service for the PropFlow Automation Framework.

Responsibilities:
  - Fetch a document's PDF bytes from Supabase Storage via a signed URL
  - Track delivery status in the automation_logs table
  - Provide a reusable bytes payload suitable for email attachment

Design note: this service never stores PDF bytes to disk. The bytes are
fetched into memory, attached to the email, and then discarded. For large
documents (>10 MB) callers should instead pass a pre-signed URL and let
the recipient's mail client download directly.
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from services.supabase_client import SupabaseService

logger = logging.getLogger(__name__)

# Maximum PDF size we will attach inline (10 MB)
_MAX_INLINE_BYTES = 10 * 1024 * 1024


class DocumentService:
    """
    Handles document retrieval and delivery tracking.
    """

    def __init__(self) -> None:
        self._svc = SupabaseService()

    async def fetch_pdf_bytes(
        self,
        document_url: str,
        company_id: str,
        document_id: str,
    ) -> tuple[Optional[bytes], str]:
        """
        Download the PDF from the given signed URL.

        Returns (pdf_bytes, error_message). On success, error_message is "".
        On failure, pdf_bytes is None and error_message describes the problem.

        The company_id and document_id are used only for log messages; no
        additional auth check is done here because the signed URL already
        embeds Supabase's access control.
        """
        if not document_url:
            return None, "document_url is empty"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(document_url)

            if response.status_code != 200:
                return (
                    None,
                    f"Storage returned HTTP {response.status_code} for "
                    f"document_id={document_id}",
                )

            content_type = response.headers.get("content-type", "")
            if "pdf" not in content_type and len(response.content) < 4:
                # Minimal sanity check: real PDFs start with %PDF
                pass
            elif response.content[:4] != b"%PDF":
                logger.warning(
                    "document_id=%s does not appear to be a PDF (first 4 bytes: %r)",
                    document_id,
                    response.content[:4],
                )

            if len(response.content) > _MAX_INLINE_BYTES:
                return (
                    None,
                    f"Document exceeds {_MAX_INLINE_BYTES // (1024*1024)} MB "
                    "inline limit — send the URL instead",
                )

            return response.content, ""

        except httpx.TimeoutException:
            return (
                None,
                f"Timeout fetching document_id={document_id} from storage",
            )
        except Exception as exc:
            logger.exception(
                "Unexpected error fetching document_id=%s company_id=%s",
                document_id,
                company_id,
            )
            return None, f"Fetch error: {exc}"

    def get_filename(self, document: dict, fallback: str = "document.pdf") -> str:
        """
        Derive a clean filename for a document row.

        Prefers explicit title/name fields, then falls back to the document id.
        """
        title: str = (
            document.get("title")
            or document.get("name")
            or document.get("file_name")
            or ""
        ).strip()

        if not title:
            return f"{document.get('id', 'document')}.pdf"

        # Ensure .pdf extension
        if not title.lower().endswith(".pdf"):
            title = f"{title}.pdf"

        # Sanitise: replace characters that would break email headers
        safe = "".join(c if c.isalnum() or c in " ._-" else "_" for c in title)
        return safe.strip() or fallback

    def mark_delivered(
        self,
        document_id: str,
        company_id: str,
        recipient_email: str,
    ) -> None:
        """
        Record successful delivery in automation_logs.

        This is best-effort — a failure here must never block the calling flow.
        """
        from models.schemas import AutomationStatus

        try:
            self._svc.save_automation_log(
                company_id=company_id,
                automation_type="document_delivery",
                status=AutomationStatus.SUCCESS,
                details={
                    "document_id": document_id,
                    "recipient_email": recipient_email,
                },
            )
        except Exception:
            logger.exception(
                "Failed to mark delivery for document_id=%s", document_id
            )

    def mark_failed(
        self,
        document_id: str,
        company_id: str,
        recipient_email: str,
        reason: str,
    ) -> None:
        """Record a failed delivery attempt."""
        from models.schemas import AutomationStatus

        try:
            self._svc.save_automation_log(
                company_id=company_id,
                automation_type="document_delivery",
                status=AutomationStatus.FAILED,
                details={
                    "document_id": document_id,
                    "recipient_email": recipient_email,
                },
                error_message=reason[:1000],
            )
        except Exception:
            logger.exception(
                "Failed to mark failure for document_id=%s", document_id
            )
