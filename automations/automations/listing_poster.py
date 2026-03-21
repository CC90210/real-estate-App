"""
Listing Poster Automation

Triggered by: LISTING_PUBLISHED

Posts a property listing to configured third-party platforms when an
agent publishes a listing from PropFlow.

Supported platforms (extensible):
  - facebook_marketplace  — via Facebook Graph API
  - kijiji                — via Kijiji Autos API (Canada)
  - craigslist            — scrape-free HTTP post (limited)

Required payload keys:
  - listing_id    (str) — UUID of the listings row

Optional payload keys:
  - platforms     (list[str]) — specific platforms to post to;
                                defaults to all enabled in automation_settings
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from automations.base import BaseAutomation
from models.schemas import AutomationResult, AutomationTrigger
from services.supabase_client import SupabaseService

logger = logging.getLogger(__name__)

# Platform identifiers that automation_settings.listing_platforms can contain
SUPPORTED_PLATFORMS: set[str] = {"facebook_marketplace", "kijiji", "craigslist"}


class ListingPosterAutomation(BaseAutomation):
    automation_type = "listing_poster"

    def __init__(self) -> None:
        super().__init__()

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate(self, trigger: AutomationTrigger) -> bool:
        return self._require_payload_keys(trigger, "listing_id")

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    async def _run(self, trigger: AutomationTrigger) -> AutomationResult:
        p = trigger.payload
        company_id = trigger.company_id
        listing_id: str = p["listing_id"]
        requested_platforms: list[str] | None = p.get("platforms")

        # ------------------------------------------------------------------
        # Step 1: Load listing with property data
        # ------------------------------------------------------------------
        listing = self._svc.get_listing(listing_id, company_id)

        if not listing:
            return AutomationResult(
                success=False,
                automation_type=self.automation_type,
                company_id=company_id,
                message=f"Listing {listing_id} not found for company {company_id}",
            )

        # ------------------------------------------------------------------
        # Step 2: Resolve which platforms to post to
        # ------------------------------------------------------------------
        enabled_platforms = self._resolve_platforms(company_id, requested_platforms)

        if not enabled_platforms:
            return AutomationResult(
                success=True,
                automation_type=self.automation_type,
                company_id=company_id,
                message="Listing post skipped: no platforms configured or requested.",
                details={"listing_id": listing_id, "skipped_reason": "no_platforms"},
            )

        # ------------------------------------------------------------------
        # Step 3: Format listing per-platform and post
        # ------------------------------------------------------------------
        results: dict[str, str] = {}
        platform_credentials = self._load_platform_credentials(company_id)

        for platform in enabled_platforms:
            if platform not in SUPPORTED_PLATFORMS:
                results[platform] = f"skipped: unsupported platform '{platform}'"
                continue

            formatted = self._format_listing(listing, platform)
            ok, detail = await self._post_to_platform(
                platform=platform,
                formatted_listing=formatted,
                credentials=platform_credentials.get(platform, {}),
                company_id=company_id,
            )
            results[platform] = detail if ok else f"FAILED: {detail}"

        all_ok = all(not v.startswith("FAILED") for v in results.values())

        return AutomationResult(
            success=all_ok,
            automation_type=self.automation_type,
            company_id=company_id,
            message=(
                f"Listing {listing_id} posted to {len(results)} platform(s)"
                if all_ok
                else f"Some platforms failed: {results}"
            ),
            details={"listing_id": listing_id, "platform_results": results},
        )

    # ------------------------------------------------------------------
    # Listing formatter
    # ------------------------------------------------------------------

    def _format_listing(
        self, listing: dict[str, Any], platform: str
    ) -> dict[str, Any]:
        """
        Build a platform-specific listing payload from the canonical listing row.

        All platforms share a common subset of fields; platform-specific
        formatting is applied as overrides.
        """
        property_data: dict = listing.get("properties") or {}

        base = {
            "title": listing.get("title")
            or f"{property_data.get('bedrooms', '')} bed — {property_data.get('address', 'Property')}",
            "description": listing.get("description", ""),
            "price": listing.get("price") or listing.get("rent_amount") or 0,
            "address": property_data.get("address", ""),
            "city": property_data.get("city", ""),
            "province": property_data.get("province", ""),
            "postal_code": property_data.get("postal_code", ""),
            "bedrooms": property_data.get("bedrooms"),
            "bathrooms": property_data.get("bathrooms"),
            "square_feet": property_data.get("square_feet"),
            "available_date": listing.get("available_date", ""),
            "photos": listing.get("photos") or [],
            "amenities": property_data.get("amenities") or [],
            "pet_friendly": property_data.get("pet_friendly", False),
        }

        if platform == "facebook_marketplace":
            return {
                **base,
                "category": "HOUSING_RENTAL",
                "currency": "CAD",
                "availability": "AVAILABLE",
            }

        if platform == "kijiji":
            return {
                **base,
                "ad_type": "OFFER",
                "category_id": "34",  # Apartments & Condos for Rent
            }

        if platform == "craigslist":
            return {
                **base,
                "posting_body": base["description"],
                "ask": base["price"],
            }

        return base

    # ------------------------------------------------------------------
    # Platform poster dispatchers
    # ------------------------------------------------------------------

    async def _post_to_platform(
        self,
        platform: str,
        formatted_listing: dict[str, Any],
        credentials: dict[str, Any],
        company_id: str,
    ) -> tuple[bool, str]:
        """
        Dispatch the formatted listing to the appropriate platform handler.
        Returns (success, detail_message).
        """
        if platform == "facebook_marketplace":
            return await self._post_facebook(formatted_listing, credentials)
        if platform == "kijiji":
            return await self._post_kijiji(formatted_listing, credentials)
        if platform == "craigslist":
            return await self._post_craigslist(formatted_listing, credentials)

        return False, f"No handler for platform: {platform}"

    async def _post_facebook(
        self,
        listing: dict[str, Any],
        credentials: dict[str, Any],
    ) -> tuple[bool, str]:
        access_token = credentials.get("access_token")
        page_id = credentials.get("page_id")

        if not access_token or not page_id:
            return (
                False,
                "Facebook Marketplace credentials not configured "
                "(access_token or page_id missing)",
            )

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"https://graph.facebook.com/v19.0/{page_id}/listings",
                    json={
                        "name": listing["title"],
                        "description": listing["description"],
                        "price": str(listing["price"]),
                        "currency": listing.get("currency", "CAD"),
                        "category": listing.get("category", "HOUSING_RENTAL"),
                        "availability": "AVAILABLE",
                    },
                    params={"access_token": access_token},
                )

            if resp.status_code in (200, 201):
                data = resp.json()
                return True, f"Facebook listing id={data.get('id', 'unknown')}"
            return False, f"Facebook API error {resp.status_code}: {resp.text[:300]}"
        except Exception as exc:
            return False, f"Facebook exception: {exc}"

    async def _post_kijiji(
        self,
        listing: dict[str, Any],
        credentials: dict[str, Any],
    ) -> tuple[bool, str]:
        """
        Kijiji Autos API stub.
        Replace with real endpoint when Kijiji API access is granted.
        """
        api_key = credentials.get("api_key")

        if not api_key:
            return False, "Kijiji credentials not configured (api_key missing)"

        # Kijiji API is not publicly documented; this is a placeholder
        # that logs the intent without making a real network call.
        logger.info(
            "Kijiji post placeholder: title=%s price=%s",
            listing.get("title"),
            listing.get("price"),
        )
        return True, "Kijiji: logged (integration pending API access)"

    async def _post_craigslist(
        self,
        listing: dict[str, Any],
        credentials: dict[str, Any],
    ) -> tuple[bool, str]:
        """
        Craigslist does not offer a public API.
        This method reserves the slot and returns a polite skip.
        """
        return (
            True,
            "Craigslist: skipped (no public API — manual posting required)",
        )

    # ------------------------------------------------------------------
    # Credential / platform helpers
    # ------------------------------------------------------------------

    def _resolve_platforms(
        self, company_id: str, requested: list[str] | None
    ) -> list[str]:
        """
        Return the list of platforms to post to.

        If `requested` is provided, filter it against the company's configured
        platforms.  Otherwise return all configured platforms.
        """
        configured = self._load_configured_platforms(company_id)

        if not configured:
            return requested or []

        if requested:
            return [p for p in requested if p in configured]

        return configured

    def _load_configured_platforms(self, company_id: str) -> list[str]:
        try:
            result = (
                self._svc._db.table("automation_settings")
                .select("listing_platforms")
                .eq("company_id", company_id)
                .single()
                .execute()
            )
            platforms = (result.data or {}).get("listing_platforms") or []
            return platforms if isinstance(platforms, list) else []
        except Exception:
            return []

    def _load_platform_credentials(self, company_id: str) -> dict[str, dict]:
        """
        Load per-platform OAuth tokens / API keys from automation_settings.

        Expected column: platform_credentials JSONB
          { "facebook_marketplace": { "access_token": "...", "page_id": "..." } }
        """
        try:
            result = (
                self._svc._db.table("automation_settings")
                .select("platform_credentials")
                .eq("company_id", company_id)
                .single()
                .execute()
            )
            creds = (result.data or {}).get("platform_credentials") or {}
            return creds if isinstance(creds, dict) else {}
        except Exception:
            return {}
