# PropFlow - Claude Code Instructions

## Project Overview
PropFlow is a rental automation platform targeting landlords and rental agents. It streamlines the entire rental process from property onboarding through key handoff using an 8-phase gated workflow.

**Production URL:** https://propflow.pro
**Company:** Ellis Capital Group
**Domain Expert:** Joseph Shaffer

## Tech Stack
- **Framework:** Next.js 16 (App Router) with TypeScript
- **Styling:** Tailwind CSS + Shadcn/UI (Radix primitives)
- **Database:** Supabase (PostgreSQL) with Row-Level Security
- **Auth:** Supabase Auth (cookie-based sessions via `@supabase/ssr`)
- **Payments:** Stripe (subscriptions, Connect for rent collection)
- **AI:** Google Gemini (`@google/generative-ai`) for PDF parsing
- **State:** TanStack React Query for server state
- **Forms:** React Hook Form + Zod validation
- **Social Media:** Late API (`@getlatedev/node`) for post scheduling
- **Automations:** Python FastAPI service (in `/automations/`)
- **Deployment:** Vercel

## Critical: Next.js 16 Proxy Pattern
Next.js 16 uses `src/proxy.ts` instead of `middleware.ts`. **Never create a `middleware.ts` file** - it will cause build errors: "Both middleware file and proxy file are detected."

The proxy file delegates to `src/lib/supabase/middleware.ts` which handles session refresh and route protection.

## Project Structure
```
src/
  app/
    (dashboard)/     # Authenticated routes (20 sections)
    api/             # 52+ API route handlers
    login/           # Auth pages
    signup/
    error.tsx        # Root error boundary
    not-found.tsx    # 404 page
  components/
    ui/              # 30 Shadcn/UI primitives
    ...              # 80+ feature components
  lib/
    supabase/        # Client/server/middleware Supabase helpers
    hooks/           # 15 custom hooks (useUser, useProperties, etc.)
    services/        # Business logic (plan-service, etc.)
    plans/           # Plan tiers + feature gating
    schemas/         # Zod validation schemas
    utils/           # Shared utilities
    contexts/        # React contexts
  types/
    database.ts      # Core TypeScript interfaces
  proxy.ts           # Next.js 16 middleware entry point
automations/         # Python FastAPI automation service
supabase/
  migrations/        # 22+ SQL migration files
```

## Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json)

## 8-Phase Workflow (GATES Model)
1. Property Onboarding
2. Pre-Rental Inspection
3. Listing & Marketing
4. Lead Communication
5. Application & Vetting
6. Documents & E-Sign
7. Payment Collection
8. Key Handoff

Each phase is a gate - prerequisites must be completed before proceeding.

## Plan Tiers & Feature Gating
- **Agent Pro:** $149/month
- **Agency Growth:** $289/month
- **Brokerage Command:** $499/month

Feature gating uses `FeatureGate.tsx`, `LimitGuard.tsx`, and `src/lib/plans/gate.ts`. Social media features are restricted to Brokerage Command.

## Database Conventions
- All tables use `company_id` for multi-tenancy with RLS
- Helper functions: `get_user_company_id()`, `get_my_company()` for RLS policies
- FK constraints are required for PostgREST join queries (e.g., `profiles:submitted_by(full_name)`)
- Use `.maybeSingle()` instead of `.single()` for optional rows
- Always include `NOTIFY pgrst, 'reload schema'` in migrations that add FK constraints

## Supabase Patterns
```typescript
// Server client (API routes)
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Browser client (components)
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

## Auth & Security
- Super admin emails: configured via `SUPER_ADMIN_EMAILS` env var (server) and `NEXT_PUBLIC_SUPER_ADMIN_EMAILS` (client)
- Auth fallback role is `agent` (least privilege)
- Webhook routes validate signatures (HMAC-SHA256 for custom, Stripe signature for Stripe)
- CSP headers configured in `next.config.ts`
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client

## Key Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
NEXT_PUBLIC_N8N_WEBHOOK_URL
WEBHOOK_SECRET
AUTOMATION_URL
NEXT_PUBLIC_APP_URL
LATE_API_KEY
SUPER_ADMIN_EMAILS
NEXT_PUBLIC_SUPER_ADMIN_EMAILS
```

## AI Document Processing
- Uses Gemini for screening report PDF parsing
- Auto-selects model: `gemini-1.5-flash` for <5MB, `gemini-1.5-pro` for >5MB
- Base64 inline data for PDF upload to Gemini API
- Robust JSON extraction with markdown fence stripping and boundary detection
- Max file size: 250MB (enterprise documents)

## Testing
- E2E: Playwright against production (propflow.pro)
- No unit test framework configured yet
- Test files: `test-*.pdf` in project root (gitignored)

## Git Conventions
- Branch: `main` (single branch workflow)
- Deploy: auto-deploy to Vercel on push to main
- Commit style: `type: description` (e.g., `fix:`, `feat:`, `security+fix:`)

## Common Patterns

### API Route Structure
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // ...
}
```

### Graceful Join Fallback
When PostgREST joins may fail (missing FK), use a try/fallback pattern:
```typescript
const { data, error } = await supabase.from('table').select('*, profiles:user_id(full_name)')
if (error) {
    // Retry without joins
    const { data: fallback } = await supabase.from('table').select('*')
    return fallback || []
}
```

### Component Conventions
- Use Shadcn/UI primitives from `@/components/ui/`
- Toast notifications via `sonner` (`toast.success()`, `toast.error()`)
- Loading states with Skeleton components
- Error states with ErrorState component

## Sequential Build Protocol
Every feature follows this exact order — never skip steps:
1. **DATABASE** — Migration SQL (idempotent, RLS, FK, NOTIFY pgrst)
2. **TYPES** — Update `src/types/database.ts` to match schema
3. **API ROUTE** — Auth check, company isolation, Zod validation, error handling
4. **HOOK** — TanStack Query with proper keys, staleTime, enabled guard
5. **UI** — Page with loading skeleton, error state, empty state, feature gate
6. **VERIFY** — `npm run build`, Playwright E2E, check console for errors

## Security Hardening (2026-03-26) — PRODUCTION READY

4 waves, 4 commits (e28e8e1 → 617a720). Final audit: **7/7 PASS**.

- **RLS:** All 10 core tables enforce `company_id = get_user_company_id()`. Zero god-mode policies.
- **Webhooks:** Stripe signature, SingleKey HMAC (constant-time), automation callback HMAC. All use admin client (no cookie-based auth in server-to-server flows).
- **Middleware:** All 20 dashboard route groups protected.
- **API routes:** Every route auth-gated + company-scoped. Zod validation on all payloads.
- **Error sanitization:** No internal DB/API details leak to client.
- **Python backend:** CORS restricted to production (localhost only in debug), JWT uses proper secret, SMTP encryption failure raises (no plaintext fallback), bearer token length validation.
- **Remaining:** Rate limiting is in-memory (needs Redis for multi-instance). No unit tests.

## Phase Status
- P1 Property Onboarding: COMPLETE
- P2 Pre-Rental Inspection: COMPLETE
- P3 Listing & Marketing: COMPLETE
- P4 Lead Communication: IN PROGRESS (Gmail connected, needs lead capture + auto-response + tour scheduling)
- P5 Application & Vetting: IN PROGRESS (CRUD + screening done, needs comparison view + batch actions)
- P6 Documents & E-Sign: NOT STARTED
- P7 Payment Collection: NOT STARTED
- P8 Key Handoff: NOT STARTED

## Do NOT
- Create `middleware.ts` (use `proxy.ts` only)
- Use `.single()` for queries that might return 0 rows
- Hardcode super admin emails in source code
- Skip FK constraints when using PostgREST joins
- Use `'admin'` as a fallback role anywhere
- Commit `.env.local`, credentials, or API keys
- Add unnecessary abstractions or over-engineer solutions
