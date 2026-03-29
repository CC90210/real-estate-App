# PropFlow — Codex Deep Debugging & Production Hardening Prompt

You are debugging and hardening **PropFlow**, a rental automation SaaS platform targeting landlords and rental agents. The app streamlines the entire rental process through an 8-phase gated workflow: Property Onboarding → Pre-Rental Inspection → Listing & Marketing → Lead Communication → Application & Vetting → Documents & E-Sign → Payment Collection → Key Handoff.

**Production URL:** https://propflow.pro
**Company:** Ellis Capital Group

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Shadcn/UI (Radix primitives)
- **Backend:** Supabase (PostgreSQL) with Row-Level Security, 52+ API route handlers in `src/app/api/`
- **Auth:** Supabase Auth (cookie-based sessions via `@supabase/ssr`)
- **Payments:** Stripe (subscriptions + Connect for rent collection)
- **AI:** Google Gemini for PDF parsing (screening reports)
- **State Management:** TanStack React Query for server state
- **Forms:** React Hook Form + Zod validation
- **Python Backend:** FastAPI automation service in `/automations/` (email, document processing, application handling, listing posting)
- **Deployment:** Vercel (Next.js), separate deployment for Python service

---

## Critical Architecture Notes

1. **Next.js 16 uses `src/proxy.ts` instead of `middleware.ts`.** NEVER create a `middleware.ts` — it causes build errors.
2. **Path alias:** `@/*` maps to `./src/*`
3. **Multi-tenancy:** All tables use `company_id` with RLS. Helper functions: `get_user_company_id()`, `get_my_company()`.
4. **Supabase patterns:**
   - Server client: `import { createClient } from '@/lib/supabase/server'` → `const supabase = await createClient()`
   - Browser client: `import { createClient } from '@/lib/supabase/client'` → `const supabase = createClient()`
5. **Super admin emails** come from env vars `SUPER_ADMIN_EMAILS` (server) and `NEXT_PUBLIC_SUPER_ADMIN_EMAILS` (client). Never hardcode.
6. **Auth fallback role** is `'agent'` (least privilege). Never use `'admin'` as a fallback.

---

## Project Structure

```
src/
  app/
    (dashboard)/     # 20 authenticated route groups
    (tenant)/        # Tenant portal routes
    api/             # 52+ API route handlers
    login/, signup/  # Auth pages
  components/
    ui/              # 30 Shadcn/UI primitives
    social/          # Social media suite components
    ...              # 80+ feature components
  lib/
    supabase/        # Client/server/middleware helpers
    hooks/           # 15 custom hooks
    services/        # Business logic (plan-service, stats-service, activity-logger)
    plans/           # Plan tiers + feature gating
    schemas/         # Zod validation schemas
    automations/     # Client-side automation dispatcher/engine/triggers
    contexts/        # React contexts
  types/
    database.ts      # Core TypeScript interfaces (26 interfaces)
  proxy.ts           # Next.js 16 proxy entry point
automations/         # Python FastAPI backend
  api/routes.py      # API endpoints with rate limiting
  automations/       # 4 automation handlers
  services/          # Email, document, Supabase services
  config.py          # Environment configuration
  main.py            # FastAPI app entry point
supabase/
  migrations/        # 22+ SQL migration files
```

---

## YOUR MISSION

Focus on **backend debugging, API hardening, type safety, and data integrity**. Fix all bugs below. Do NOT redesign the frontend UI — focus on making the backend bulletproof and ensuring the frontend data layer works correctly.

---

## CONFIRMED BUGS TO FIX (Priority Order)

### BUG 1 — CRITICAL: Properties API Route Invalid Join (Breaks Listings Page)
**File:** `src/app/api/properties/route.ts` — line ~162
**Symptom:** "Failed to load properties" toast error when clicking the Marketplaces tab on the Social/Listings page.
**Root Cause:** The GET handler queries:
```typescript
.select('*, buildings(name, address), areas(name)')
```
But `properties` has NO direct FK to `areas`. The relationship is `properties → buildings → areas`. PostgREST cannot resolve `areas(name)` from `properties`.
**Fix:** Either remove the `areas(name)` join or use the correct nested path:
```typescript
.select('*, buildings(name, address, areas(name))')
```
Also add a graceful fallback pattern (try with joins, retry without on error) like the maintenance route already does.

### BUG 2 — HIGH: 4 API Routes Use `.single()` Instead of `.maybeSingle()`
`.single()` throws a PostgREST error when 0 rows are returned. These should use `.maybeSingle()`:
1. **`src/app/api/user/profile/route.ts`** ~line 43 — profile fetch (user may not have profile yet)
2. **`src/app/api/stripe/webhook/route.ts`** ~line 69 — company lookup by subscription ID
3. **`src/app/api/maintenance/route.ts`** ~line 160 — maintenance request update result
4. **`src/app/api/admin/stats/route.ts`** ~line 38 — admin join result

### BUG 3 — HIGH: ApplicationStatus Type Too Restrictive
**File:** `src/types/database.ts` — Application interface
**Current:** `status` only allows `'new' | 'screening' | 'approved' | 'denied' | 'withdrawn'`
**Database CHECK constraint allows:** `'new' | 'submitted' | 'pending' | 'screening' | 'reviewing' | 'pending_landlord' | 'approved' | 'denied' | 'rejected' | 'withdrawn' | 'archived' | 'cancelled'`
**Fix:** Update the TypeScript type to match the database constraint exactly.

### BUG 4 — HIGH: 8 Database Tables Missing TypeScript Interfaces
**File:** `src/types/database.ts`
These tables exist in migrations but have NO TypeScript interfaces:
1. `application_screening_reports` — screening report data + AI extraction fields
2. `automation_configs` — automation configuration per company
3. `automation_executions` — automation execution history
4. `webhook_events` — webhook event log
5. `invoice_items` — line items for invoices
6. `tenant_payments` — Stripe payment tracking for tenants
7. `landlord_properties` — join table linking landlords to properties
8. `agent_social_profiles` — Late API social profile links

Read the migration files in `supabase/migrations/` to get the exact column definitions and create matching interfaces.

### BUG 5 — HIGH: AutomationSettings Interface Missing Columns
**File:** `src/types/database.ts` — AutomationSettings interface
**Missing fields from migration `20260321_python_automation_settings.sql`:**
- `email_provider`, `smtp_host`, `smtp_port`, `smtp_user`, `smtp_password`, `from_name`, `from_email`
- `platform_credentials`, `listing_platforms`

### BUG 6 — MEDIUM: useShowings Hook Query Key Contains Object Reference
**File:** `src/lib/hooks/useShowings.ts` ~line 46
```typescript
queryKey: ['showings', companyId, options, profile?.role]
```
`options` is an object — if the parent re-renders with a new object reference (same values), React Query creates a new cache entry every time.
**Fix:** Destructure options into primitive values:
```typescript
queryKey: ['showings', companyId, options?.agentId, options?.propertyId, options?.status, options?.fromDate, options?.toDate, profile?.role]
```

### BUG 7 — MEDIUM: useFeatureGate Missing `enabled` Guard
**File:** `src/lib/hooks/useFeatureGate.ts` ~line 11
The query fires immediately without checking if user is authenticated. It should have `enabled: !!user` or similar guard to prevent unnecessary 401 errors on page load.

### BUG 8 — MEDIUM: useStats Returns null Instead of Throwing
**File:** `src/lib/hooks/useStats.ts` ~line 19-24
When `companyId` is missing, queryFn resolves with `null` instead of throwing. This causes silent failure — stats never load but no error is shown.
**Fix:** Either throw an error or add `enabled: !!companyId` guard.

### BUG 9 — MEDIUM: Inconsistent Error Response Formats Across API Routes
Some routes return `{ error: 'message' }`, others return `{ error: 'message', details: [...] }`, others return `{ error: 'message', code: 'ERROR_CODE' }`.
**Fix:** Standardize all 52+ API routes to a consistent format:
```typescript
{ error: 'User-friendly message', code?: 'ERROR_CODE', details?: ValidationError[] }
```

### BUG 10 — MEDIUM: Missing staleTime on Multiple Hooks
These hooks have no explicit `staleTime`, defaulting to 0 (always stale, refetches on every mount):
- `useAutomations.ts`
- `useFeatureGate.ts`
- `useNotifications.ts`
Set appropriate staleTime values: 30-60s for operational data, 5min for reference data like plan info.

---

## PYTHON BACKEND BUGS (in `/automations/`)

### BUG 11 — CRITICAL: SMTP TLS/STARTTLS Logic Inverted
**File:** `automations/services/email_service.py` ~line 412
```python
use_tls = (credentials.smtp_port or 587) == 465
```
This means ANY port that isn't 465 gets `start_tls=True`, including port 25 (plaintext). Port 25 should use neither TLS nor STARTTLS.
**Fix:**
```python
use_tls = (credentials.smtp_port or 587) == 465
start_tls = (credentials.smtp_port or 587) == 587
```

### BUG 12 — HIGH: In-Memory Rate Limiting (Not Production-Safe)
**File:** `automations/api/routes.py` ~line 54-82
Rate limiting uses a Python dict (`_rate_buckets`). Resets on restart, doesn't work across instances, and has unbounded memory growth.
**Fix:** Implement Redis-backed rate limiting, or at minimum add a periodic cleanup of old entries and document the limitation.

### BUG 13 — HIGH: JWT Secret Format Not Validated
**File:** `automations/config.py` ~line 86-88
The `SUPABASE_JWT_SECRET` env var is checked for presence but not minimum length or format. A 1-character secret would pass validation.
**Fix:** Add `len(supabase_jwt_secret) < 32` check.

### BUG 14 — MEDIUM: Bearer Token Validation Too Lenient
**File:** `automations/api/routes.py` ~line 143-148
Only checks `len(token) < 20`. JWTs always have exactly 2 dots.
**Fix:**
```python
if len(token) < 32 or token.count(".") != 2:
    raise HTTPException(...)
```

### BUG 15 — MEDIUM: Idempotency Key Has No TTL
**File:** `automations/api/routes.py` ~line 368-388
Idempotency check queries `automation_logs` with no time window. A key from weeks ago still prevents new executions.
**Fix:** Add `.gte("created_at", thirty_minutes_ago)` to the query.

### BUG 16 — MEDIUM: Application Processor Uses `.single()` Without Null Check
**File:** `automations/automations/application_processor.py` ~line 196
Uses `.single()` for agent profile lookup. If the agent profile was deleted, this throws.
**Fix:** Use `.maybe_single()` and handle null.

### BUG 17 — LOW: CORS `allow_headers=["*"]` Is Too Permissive
**File:** `automations/main.py` ~line 107-113
**Fix:** Restrict to `["Content-Type", "X-PropFlow-Signature", "Authorization"]`.

### BUG 18 — LOW: SMTP Password Decryption Fallback Not Logged
**File:** `automations/services/email_service.py` ~line 41-63
When decryption fails, falls back to raw password silently. Should log a warning.

### BUG 19 — LOW: Document Service Doesn't Hard-Fail on Non-PDF Content
**File:** `automations/services/document_service.py` ~line 79-85
Only logs a warning when downloaded file isn't a PDF. Should return an error instead of attaching wrong content to emails.

---

## VERIFICATION CHECKLIST

After fixing bugs, verify:
1. `npm run build` passes with zero errors
2. The Marketplaces/Listings tab loads properties without error toast
3. All TypeScript interfaces match their database table schemas
4. No `.single()` calls on queries that could return 0 rows
5. All hooks have appropriate `enabled` guards and `staleTime` values
6. Python backend starts without warnings (`python -m uvicorn automations.main:app`)
7. All API routes return consistent error response shapes

---

## DO NOT

- Create a `middleware.ts` file (use `proxy.ts` only)
- Redesign or restyle any UI components
- Add new features — only fix existing bugs
- Change the database schema without providing migration SQL
- Use `.single()` for queries that might return 0 rows
- Use `'admin'` as a fallback role anywhere
- Skip the graceful join fallback pattern on PostgREST queries with FK joins
- Remove or weaken any existing security measures (RLS, webhook signature verification, auth checks)
- Add unnecessary abstractions or over-engineer solutions
