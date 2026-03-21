# PropFlow Automation Framework

A self-contained Python automation service that replaces n8n for PropFlow.
Each company gets isolated automation configuration — no credential sharing.

## Quick Start

```bash
cd automations
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.local .env            # or set env vars directly
uvicorn main:app --port 8001 --reload
```

## Required Environment Variables

| Variable | Source | Description |
|---|---|---|
| `SUPABASE_URL` | Supabase dashboard | Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase dashboard | Service role key (bypasses RLS) |
| `WEBHOOK_SECRET` | `.env.local` | Shared HMAC secret with Next.js |
| `RESEND_API_KEY` | Resend dashboard | Fallback email when no SMTP configured |
| `GEMINI_API_KEY` | Google AI Studio | Reserved for future AI features |

Optional:
| `AUTOMATION_PORT` | — | Default: 8001 |
| `AUTOMATION_DEBUG` | — | Set `true` to enable /docs and auto-reload |
| `SINGLEKEY_API_KEY` | SingleKey | Tenant screening API key |

## Architecture

```
Next.js App  ──POST /api/trigger──►  FastAPI (this service)
                HMAC signature              │
                                     AutomationRegistry
                                      ├── DocumentSenderAutomation
                                      ├── ApplicationProcessorAutomation
                                      ├── FollowUpAutomation
                                      └── ListingPosterAutomation
                                            │
                                       Supabase (service role)
                                       Email (SMTP or Resend)
                                       SingleKey API
```

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | None | Liveness probe |
| POST | `/api/trigger` | HMAC signature | Receive automation from Next.js |
| POST | `/api/connect` | Bearer JWT | Company saves email credentials |
| GET | `/api/status/{company_id}` | Bearer JWT | View recent automation logs |

## Triggering from Next.js

The existing `src/app/api/automations/trigger/route.ts` sends to n8n.
Update `N8N_BASE_URL` (or `N8N_WEBHOOK_URL`) in `.env.local` to point at
this service instead:

```
N8N_WEBHOOK_URL=http://localhost:8001/api/trigger
```

The HMAC signature format is identical — `X-PropFlow-Signature` header,
SHA-256 HMAC of the raw JSON body using `WEBHOOK_SECRET`.

## Adding a New Automation

1. Create `automations/my_automation.py` extending `BaseAutomation`
2. Set `automation_type = "my_automation"`
3. Implement `validate(trigger)` and `_run(trigger)`
4. Register it in `automations/__init__.py`:
   ```python
   _registry.register("MY_EVENT_TYPE", MyAutomation)
   ```
5. Add `MY_EVENT_TYPE` to the `AutomationEventType` enum in `models/schemas.py`

## Database Tables Required

The `automation_settings` table must have these columns (in addition to
the existing webhook columns already in the schema):

```sql
alter table automation_settings
  add column if not exists email_provider       text    default 'smtp',
  add column if not exists smtp_host            text,
  add column if not exists smtp_port            integer default 587,
  add column if not exists smtp_user            text,
  add column if not exists smtp_password        text,  -- stored encrypted
  add column if not exists from_name            text,
  add column if not exists from_email           text,
  add column if not exists listing_platforms    text[]  default '{}',
  add column if not exists platform_credentials jsonb   default '{}',
  add column if not exists singlekey_api_key    text;
```

See `../supabase/migrations/` for the full migration file.

## Follow-Up Rules (Joseph's Rules)

- Minimum 2 hours of inactivity before first follow-up
- Maximum 2 follow-ups per day per lead
- Messages are brief and human-like
- No double texting — verified against automation_logs before every send

These are configurable via environment variables:
- `FOLLOW_UP_MIN_INACTIVITY_HOURS` (default: 2)
- `FOLLOW_UP_MAX_PER_DAY` (default: 2)
