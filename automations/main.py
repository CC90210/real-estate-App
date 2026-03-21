"""
PropFlow Automation Framework — FastAPI entry point.

This service replaces n8n as the automation backend for PropFlow.
It runs as a separate Python process alongside the Next.js application.

Start with:
  uvicorn main:app --host 0.0.0.0 --port 8001

Or in development:
  uvicorn main:app --reload --port 8001

Environment variables required (see config.py for full list):
  SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
  SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)
  WEBHOOK_SECRET
"""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ---------------------------------------------------------------------------
# Logging — configure before any other imports that log at module level
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Validate configuration at startup — fail fast before accepting connections
# ---------------------------------------------------------------------------

try:
    from config import get_settings
    settings = get_settings()
    logger.info("Configuration loaded. Supabase URL: %s", settings.supabase_url[:30] + "...")
except ValueError as exc:
    logger.critical("Configuration error: %s", exc)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Import the router (after settings are validated)
# ---------------------------------------------------------------------------

from api.routes import router
from automations import get_registry


# ---------------------------------------------------------------------------
# Lifespan: startup / shutdown hooks
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    registry = get_registry()
    logger.info(
        "PropFlow Automation Framework started. Registered events: %s",
        registry.registered_events(),
    )
    yield
    logger.info("PropFlow Automation Framework shutting down.")


# ---------------------------------------------------------------------------
# App construction
# ---------------------------------------------------------------------------

app = FastAPI(
    title="PropFlow Automation Framework",
    description=(
        "Python-based automation backend for PropFlow. "
        "Replaces n8n with a self-service, per-company isolated system."
    ),
    version="1.0.0",
    lifespan=lifespan,
    # Disable automatic docs in production via the debug flag
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)


# ---------------------------------------------------------------------------
# CORS — allow PropFlow's Next.js app origin
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.app_url,
        "http://localhost:3000",
        "https://propflow.pro",
        "https://www.propflow.pro",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global exception handler — never return a stack trace to the caller
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": "An internal error occurred. Please try again later."},
    )


# ---------------------------------------------------------------------------
# Mount routes
# ---------------------------------------------------------------------------

app.include_router(router)


# ---------------------------------------------------------------------------
# Standalone runner
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info",
    )
