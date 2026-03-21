"""
Configuration management for PropFlow Python Automation Framework.

All configuration is loaded from environment variables.
Per-company runtime configuration is loaded from the `automation_settings`
table in Supabase using the service role key, so no per-company secrets
ever live in this process's environment.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Optional

from dotenv import load_dotenv

load_dotenv()


# ---------------------------------------------------------------------------
# Immutable application-level settings (read once at startup)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Settings:
    # Supabase
    supabase_url: str
    supabase_service_key: str

    # Email fallback (Resend)
    resend_api_key: Optional[str]

    # AI (reserved for future intelligent automation)
    gemini_api_key: Optional[str]

    # Webhook security — shared HMAC secret between Next.js and this service
    webhook_secret: str

    # Rate limiting defaults
    max_emails_per_hour_per_company: int = 50
    follow_up_min_inactivity_hours: int = 2
    follow_up_max_per_day: int = 2

    # Server
    host: str = "0.0.0.0"
    port: int = 8001
    debug: bool = False

    # Automation framework identity
    app_url: str = "http://localhost:3000"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Load and cache application settings from environment variables.

    Raises ValueError immediately at startup if required variables are absent,
    so misconfiguration is caught before the server accepts traffic.
    """
    missing: list[str] = []

    def require(name: str) -> str:
        value = os.getenv(name, "").strip()
        if not value:
            missing.append(name)
        return value

    def optional(name: str) -> Optional[str]:
        value = os.getenv(name, "").strip()
        return value if value else None

    supabase_url = require("SUPABASE_URL") or require("NEXT_PUBLIC_SUPABASE_URL")
    supabase_service_key = require("SUPABASE_SERVICE_KEY") or require("SUPABASE_SERVICE_ROLE_KEY")
    webhook_secret = require("WEBHOOK_SECRET")

    # Collect both attempts — if still empty it was truly missing
    supabase_url = (
        os.getenv("SUPABASE_URL", "").strip()
        or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").strip()
    )
    supabase_service_key = (
        os.getenv("SUPABASE_SERVICE_KEY", "").strip()
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    )
    webhook_secret = os.getenv("WEBHOOK_SECRET", "").strip()

    real_missing: list[str] = []
    if not supabase_url:
        real_missing.append("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)")
    if not supabase_service_key:
        real_missing.append("SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)")
    if not webhook_secret:
        real_missing.append("WEBHOOK_SECRET")

    if real_missing:
        raise ValueError(
            f"Missing required environment variables: {', '.join(real_missing)}"
        )

    return Settings(
        supabase_url=supabase_url,
        supabase_service_key=supabase_service_key,
        resend_api_key=optional("RESEND_API_KEY"),
        gemini_api_key=optional("GEMINI_API_KEY"),
        webhook_secret=webhook_secret,
        max_emails_per_hour_per_company=int(
            os.getenv("MAX_EMAILS_PER_HOUR", "50")
        ),
        follow_up_min_inactivity_hours=int(
            os.getenv("FOLLOW_UP_MIN_INACTIVITY_HOURS", "2")
        ),
        follow_up_max_per_day=int(os.getenv("FOLLOW_UP_MAX_PER_DAY", "2")),
        host=os.getenv("AUTOMATION_HOST", "0.0.0.0"),
        port=int(os.getenv("AUTOMATION_PORT", "8001")),
        debug=os.getenv("AUTOMATION_DEBUG", "false").lower() == "true",
        app_url=os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    )
