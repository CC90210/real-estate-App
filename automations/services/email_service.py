"""
Email delivery service for the PropFlow Automation Framework.

Delivery strategy (in priority order):
  1. Company's own SMTP credentials (loaded per-request from Supabase)
  2. Resend API (PropFlow's fallback, used when no SMTP is configured)

Rate limiting: max 50 emails per hour per company, enforced via
automation_logs counts in Supabase so the limit survives restarts.

HTML templates use Jinja2 and mirror the design system already established
in the Next.js email.ts (blue accent #3b82f6, slate body, white card).
"""

from __future__ import annotations

import logging
import mimetypes
from dataclasses import dataclass, field
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import aiosmtplib
from jinja2 import Environment, PackageLoader, select_autoescape, DictLoader

from config import get_settings
from models.schemas import CompanyCredentials, EmailProvider
from services.supabase_client import SupabaseService

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Fernet decryption helper (mirrors _encrypt_smtp_password in api/routes.py)
# ---------------------------------------------------------------------------

def _decrypt_smtp_password(encrypted_password: str) -> str:
    """
    Decrypt a Fernet-encrypted SMTP password.

    The encryption key is derived from WEBHOOK_SECRET — the same derivation
    used by _encrypt_smtp_password in api/routes.py.
    """
    import base64
    import hashlib as _hashlib
    from cryptography.fernet import Fernet, InvalidToken

    settings = get_settings()
    raw_key = _hashlib.sha256(settings.webhook_secret.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(raw_key)
    f = Fernet(fernet_key)

    try:
        return f.decrypt(encrypted_password.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        # Password may have been stored unencrypted (pre-encryption era or
        # encryption failure at save time) — return as-is so SMTP can attempt
        # authentication with the raw value.
        return encrypted_password


# ---------------------------------------------------------------------------
# Jinja2 template environment (inline templates — no filesystem dependency)
# ---------------------------------------------------------------------------

_BASE_CSS = """
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f8fafc;color:#1e293b}
.container{max-width:600px;margin:0 auto;padding:40px 20px}
.card{background:#fff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.logo{text-align:center;margin-bottom:32px}
.logo h1{font-size:24px;font-weight:900;color:#1e293b;margin:0;letter-spacing:-.5px}
.logo p{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#3b82f6;margin:4px 0 0}
h2{font-size:22px;font-weight:800;color:#0f172a;margin:0 0 16px}
p{font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px}
.btn{display:inline-block;padding:14px 32px;background:#1e293b;color:#fff!important;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:.5px}
.btn-primary{background:#3b82f6}
.footer{text-align:center;margin-top:32px;font-size:12px;color:#94a3b8}
.highlight-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0}
table.details{width:100%;border-collapse:collapse}
table.details td{padding:8px 0;font-size:14px;border-bottom:1px solid #f1f5f9}
.label{color:#94a3b8;font-weight:600}
.value{color:#1e293b;font-weight:700;text-align:right}
"""

_TEMPLATES: dict[str, str] = {
    "base.html": """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>{{ css }}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>{{ company_name }}</h1>
        <p>Property Intelligence</p>
      </div>
      {% block content %}{% endblock %}
    </div>
    <div class="footer">
      <p>&copy; {{ year }} {{ company_name }}. All rights reserved.</p>
      <p style="margin-top:8px;"><a href="{{ app_url }}" style="color:#3b82f6;text-decoration:none;">Visit Dashboard</a></p>
    </div>
  </div>
</body>
</html>""",

    "document_delivery.html": """{% extends "base.html" %}
{% block content %}
<h2>Document Ready for Signature</h2>
<p>Hi {{ recipient_name }},</p>
<p>{{ agent_name }} has sent you a document that requires your signature.</p>
<div class="highlight-box">
  <table class="details">
    <tr><td class="label">Document</td><td class="value">{{ document_title }}</td></tr>
    <tr><td class="label">Property</td><td class="value">{{ property_address }}</td></tr>
    <tr><td class="label">Sent by</td><td class="value">{{ agent_name }}</td></tr>
  </table>
</div>
{% if message %}
<p><em>{{ message }}</em></p>
{% endif %}
<p>The document is attached to this email as a PDF. Please review it carefully before signing.</p>
<p style="font-size:13px;color:#94a3b8;">If you did not expect this document, contact your agent directly.</p>
{% endblock %}""",

    "application_confirmation.html": """{% extends "base.html" %}
{% block content %}
<h2>Application Received</h2>
<p>Hi {{ applicant_name }},</p>
<p>We have received your rental application. Our team will review it and get back to you shortly.</p>
<div class="highlight-box">
  <table class="details">
    <tr><td class="label">Property</td><td class="value">{{ property_address }}</td></tr>
    <tr><td class="label">Submitted</td><td class="value">{{ submitted_at }}</td></tr>
    <tr><td class="label">Reference</td><td class="value">{{ application_id }}</td></tr>
  </table>
</div>
<p>We aim to process applications within 2–3 business days. You will receive an email update when a decision has been made.</p>
{% endblock %}""",

    "agent_application_notification.html": """{% extends "base.html" %}
{% block content %}
<h2>New Application Received</h2>
<p>A new rental application has been submitted for one of your properties.</p>
<div class="highlight-box">
  <table class="details">
    <tr><td class="label">Applicant</td><td class="value">{{ applicant_name }}</td></tr>
    <tr><td class="label">Email</td><td class="value">{{ applicant_email }}</td></tr>
    <tr><td class="label">Property</td><td class="value">{{ property_address }}</td></tr>
    <tr><td class="label">Submitted</td><td class="value">{{ submitted_at }}</td></tr>
  </table>
</div>
<div style="text-align:center;margin:24px 0;">
  <a href="{{ app_url }}/applications" class="btn btn-primary">Review Application</a>
</div>
{% endblock %}""",

    "follow_up.html": """{% extends "base.html" %}
{% block content %}
<h2>Following Up</h2>
<p>Hi {{ lead_name }},</p>
<p>{{ follow_up_message }}</p>
<p>If you have any questions or would like to schedule a viewing, please reply to this email or contact us directly.</p>
{% endblock %}""",
}

_jinja_env = Environment(
    loader=DictLoader(_TEMPLATES),
    autoescape=select_autoescape(["html"]),
)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class EmailMessage:
    to: str
    subject: str
    html: str
    attachments: list[tuple[bytes, str, str]] = field(default_factory=list)
    # (content_bytes, filename, mime_type)


# ---------------------------------------------------------------------------
# Main service
# ---------------------------------------------------------------------------

class EmailService:
    """
    Sends emails on behalf of a company using their own SMTP credentials
    when available, falling back to the Resend API.
    """

    def __init__(self) -> None:
        self._settings = get_settings()
        self._svc = SupabaseService()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def send(
        self,
        company_id: str,
        message: EmailMessage,
    ) -> tuple[bool, str]:
        """
        Send a single email.

        Returns (success, detail_message).
        Never raises — all exceptions are caught and returned as failures
        so that callers can still log and proceed.
        """
        if not self._check_rate_limit(company_id):
            return False, "Rate limit exceeded: max 50 emails per hour per company"

        credentials = self._svc.get_company_credentials(company_id)

        if credentials and credentials.smtp_password:
            # Decrypt the Fernet-encrypted password before SMTP auth
            decrypted_pw = _decrypt_smtp_password(credentials.smtp_password)
            credentials = credentials.model_copy(update={"smtp_password": decrypted_pw})
            return await self._send_via_smtp(credentials, message)

        return await self._send_via_resend(message)

    # ------------------------------------------------------------------
    # Template rendering helpers
    # ------------------------------------------------------------------

    def render_document_delivery(
        self,
        company_name: str,
        recipient_name: str,
        agent_name: str,
        document_title: str,
        property_address: str,
        message: Optional[str] = None,
    ) -> str:
        return self._render(
            "document_delivery.html",
            company_name=company_name,
            recipient_name=recipient_name,
            agent_name=agent_name,
            document_title=document_title,
            property_address=property_address,
            message=message or "",
        )

    def render_application_confirmation(
        self,
        company_name: str,
        applicant_name: str,
        property_address: str,
        submitted_at: str,
        application_id: str,
    ) -> str:
        return self._render(
            "application_confirmation.html",
            company_name=company_name,
            applicant_name=applicant_name,
            property_address=property_address,
            submitted_at=submitted_at,
            application_id=application_id,
        )

    def render_agent_application_notification(
        self,
        company_name: str,
        applicant_name: str,
        applicant_email: str,
        property_address: str,
        submitted_at: str,
    ) -> str:
        return self._render(
            "agent_application_notification.html",
            company_name=company_name,
            applicant_name=applicant_name,
            applicant_email=applicant_email,
            property_address=property_address,
            submitted_at=submitted_at,
        )

    def render_follow_up(
        self,
        company_name: str,
        lead_name: str,
        follow_up_message: str,
    ) -> str:
        return self._render(
            "follow_up.html",
            company_name=company_name,
            lead_name=lead_name,
            follow_up_message=follow_up_message,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _render(self, template_name: str, **context: object) -> str:
        from datetime import datetime as _dt

        tmpl = _jinja_env.get_template(template_name)
        return tmpl.render(
            css=_BASE_CSS,
            year=_dt.utcnow().year,
            app_url=self._settings.app_url,
            **context,
        )

    def _check_rate_limit(self, company_id: str) -> bool:
        """Return True if the company is under their hourly email quota."""
        count = self._svc.count_emails_last_hour(company_id)
        limit = self._settings.max_emails_per_hour_per_company
        if count >= limit:
            logger.warning(
                "Email rate limit reached for company_id=%s (%d/%d)",
                company_id,
                count,
                limit,
            )
            return False
        return True

    async def _send_via_smtp(
        self,
        credentials: CompanyCredentials,
        message: EmailMessage,
    ) -> tuple[bool, str]:
        """Send using the company's own SMTP server."""
        try:
            mime = MIMEMultipart("mixed")
            mime["Subject"] = message.subject
            mime["From"] = f"{credentials.from_name} <{credentials.from_email}>"
            mime["To"] = message.to

            mime.attach(MIMEText(message.html, "html", "utf-8"))

            for content_bytes, filename, mime_type in message.attachments:
                part = MIMEApplication(content_bytes, Name=filename)
                part["Content-Disposition"] = f'attachment; filename="{filename}"'
                mime.attach(part)

            use_tls = (credentials.smtp_port or 587) == 465

            await aiosmtplib.send(
                mime,
                hostname=credentials.smtp_host,
                port=credentials.smtp_port or 587,
                username=credentials.smtp_user,
                password=credentials.smtp_password,
                use_tls=use_tls,
                start_tls=not use_tls,
            )
            return True, "Sent via SMTP"
        except Exception as exc:
            logger.exception("SMTP send failed for company=%s", credentials.company_id)
            return False, f"SMTP error: {exc}"

    async def _send_via_resend(
        self,
        message: EmailMessage,
    ) -> tuple[bool, str]:
        """Send using the PropFlow Resend account as a fallback."""
        if not self._settings.resend_api_key:
            return False, "No SMTP configured and RESEND_API_KEY is not set"

        try:
            import resend as resend_sdk  # type: ignore[import-untyped]

            resend_sdk.api_key = self._settings.resend_api_key

            params: dict[str, object] = {
                "from": "PropFlow <noreply@propflow.app>",
                "to": [message.to],
                "subject": message.subject,
                "html": message.html,
            }

            if message.attachments:
                params["attachments"] = [
                    {
                        "filename": filename,
                        "content": list(content_bytes),
                    }
                    for content_bytes, filename, _ in message.attachments
                ]

            resp = resend_sdk.Emails.send(params)
            return True, f"Sent via Resend id={resp.get('id')}"
        except Exception as exc:
            logger.exception("Resend send failed")
            return False, f"Resend error: {exc}"
