# PropFlow modernization plan

Last audited: 2026-07-19

## Executive state

The application code builds and the public site responds quickly, but production authentication is offline because the configured Supabase project (`yuqwdwsdjxliaipkyskg`) no longer exists. The old users and passwords cannot be read from the application repository. Restoring a working product therefore begins with a new, isolated PropFlow Supabase project and a verified baseline migration; it must not reuse the Bravo or OASIS databases.

The repository contains 60 pages, 69 API routes, and 34 incremental Supabase migrations. The migration folder is not yet a clean from-zero database definition because several foundational table definitions remain under `supabase/_archive/`.

## Command Centre comparison

| Capability | Command Centre standard | PropFlow state after this pass | Next gate |
| --- | --- | --- | --- |
| Authentication | Central redirects, bounded network waits, explicit failure UI | Redirects and protected paths centralized; auth errors, timeout, and recovery-session validation added | Reconnect a new backend and exercise real login/reset flows |
| Session handling | One authoritative listener with non-blocking callbacks | Blocking auth-listener profile lookup removed | Validate all roles against live RLS |
| Route protection | One tested route map | Central route map added and `/applicants` gap closed | Add role-specific route tests |
| Test pyramid | Fast unit tests plus focused browser tests | First four auth/route unit suites added; browser regressions cover home-to-login and password recovery | Add one suite per GATES phase |
| Quality automation | Pull requests cannot merge when quality regresses | CI now runs unit tests, TypeScript, lint, and production build | Reduce the warning ratchet below 720 |
| Dependency security | Patched direct and transitive dependencies | Production audit reduced from 11 findings to zero | Review monthly with Dependabot/Renovate |
| Database lifecycle | Reproducible baseline plus ordered migrations | Incremental/hotfix history only | Build and test `000_baseline.sql` on the new project |
| Observability | Health probes and actionable failure messages | Login now distinguishes backend outage from bad credentials | Add auth/database/integration health checks |

## Segment-by-segment delivery method

Every segment is completed in the same order: database and RLS, generated types, authenticated API, query/mutation hook, UI states, unit tests, browser smoke, then production telemetry. A segment is not complete merely because its page renders.

| Segment | Existing surface | Current confidence | Required acceptance proof |
| --- | --- | --- | --- |
| Platform/auth/team/admin | Login, signup, recovery, invitations, roles, tenant and admin shells | Code hardened; runtime blocked by missing backend | Login, reset, invite, logout, tenant isolation, admin denial, and session refresh pass in browser |
| 1. Property onboarding | Properties, import, areas/buildings | Code present; live data unverified | Create/edit/import/archive within one company; cross-company access denied |
| 2. Pre-rental inspection | Inspections and 3D walkthrough jobs | Code present; external worker unverified | Upload, process, retry, timeout, cost guard, and signed tour access pass |
| 3. Listing and marketing | Documents, social, listing assets | Code present; integrations unverified | Generate/export document, connect/disconnect social, and publish approval gate pass |
| 4. Lead communication | Contacts, Gmail, messages, automation UI | Prototype state remains in the communication UI | Persisted inbound lead, consent-aware reply, tour scheduling, and audit log pass |
| 5. Application and vetting | Applications, documents, screening, approvals | Broad code surface; live RLS unverified | Submit, compare, approve/reject, document access, and landlord boundary pass |
| 6. Documents and e-sign | Native signing and public signing routes | Code exists despite older status notes | Token expiry, signer identity, tamper evidence, final PDF, and audit trail pass |
| 7. Payment collection | Stripe subscription, Connect, rent checkout, invoices | High-risk code present; no live mutation performed in this audit | Test-mode checkout/webhook idempotency/refund and company ledger reconciliation pass |
| 8. Key handoff | Lease/tenant surfaces | Workflow completion is not demonstrated | Signed lease + cleared payment prerequisites enforce handoff and record custody |
| Shared reliability | Maintenance, notifications, exports, automations | Code present; backend-dependent | Retry/idempotency, rate limit, empty/error/loading state, and alerting pass |

## Quality debt register

The strict React correctness rules now pass with zero errors. The remaining 720 warnings are frozen as a no-regression ratchet: 348 explicit `any` types, 270 unused values, 59 unescaped entities, 27 raw image elements, 14 hook dependency warnings, and 2 missing alt-text warnings. Pay these down by product segment; never raise the ratchet.

## Recovery sequence

1. Create a new isolated Supabase project after owner approval.
2. Assemble a canonical baseline migration from the archived schema plus the 34 ordered migrations.
3. Apply the baseline to an empty project, generate database types, and run RLS adversarial checks.
4. Create the primary owner account and use password reset rather than attempting to recover an old password.
5. configure Vercel with the new project URL and keys, then deploy a preview.
6. Run the platform/auth acceptance proof before any business workflow testing.
7. Work through the eight GATES phases in order, attaching tests and evidence to each segment.

No production database, billing, email, social-posting, or payment mutation should occur without the owner approving that specific environment and action.
