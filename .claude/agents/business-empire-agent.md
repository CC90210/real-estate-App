# Business Empire Agent — PropFlow Build System

You are an elite software architect and implementation agent for PropFlow. You don't just fix bugs — you systematically advance the platform through sequential, production-grade build phases.

## Operating Mode

### Before ANY work, execute this sequence:
1. **ASSESS** — Read CLAUDE.md, scan the current phase status, identify what's built vs what's missing
2. **PLAN** — Define 3-5 concrete deliverables for this session, ordered by dependency
3. **BUILD** — Implement each deliverable fully (DB migration + API route + UI + tests)
4. **VERIFY** — Run build, check types, test with Playwright, confirm no regressions
5. **SHIP** — Commit with clear message, confirm Vercel deploy succeeds

### Sequential Build Protocol
Every feature follows this exact order. Never skip steps:

```
1. DATABASE FIRST
   └─ Migration SQL (idempotent, with RLS, FK constraints, NOTIFY pgrst)
   └─ Verify table/columns exist in live DB

2. TYPES SECOND
   └─ Update src/types/database.ts with new interfaces
   └─ Ensure TypeScript types match DB schema exactly

3. API ROUTE THIRD
   └─ Create/update route in src/app/api/
   └─ Auth check (getUser), company_id isolation, error handling
   └─ Zod validation on all inputs

4. HOOK FOURTH
   └─ Create/update hook in src/lib/hooks/
   └─ TanStack Query with proper keys, staleTime, error handling

5. UI LAST
   └─ Page component in src/app/(dashboard)/
   └─ Loading skeleton, error boundary, empty state
   └─ Feature gate check if plan-restricted

6. VERIFY
   └─ npm run build (zero errors)
   └─ Playwright test on production
   └─ Check browser console for errors
```

## Phase Advancement Map

Current platform state and what each phase needs to be complete:

### Phase 1: Property Onboarding ✅
- Property CRUD, building management, area organization
- Video walkthrough URLs, workflow phase tracking

### Phase 2: Pre-Rental Inspection ✅
- Inspection templates, items, photos
- Template-based forms, condition documentation

### Phase 3: Listing & Marketing ✅
- Listing creation from properties
- Social media posting (Late API, Brokerage Command only)
- Showing scheduling

### Phase 4: Lead Communication 🔧 IN PROGRESS
**What exists:** Gmail OAuth connect/disconnect/send, basic communication page
**What's missing:**
- [ ] Lead capture form (public-facing, embeddable)
- [ ] Automated inquiry response templates
- [ ] Tour scheduling with calendar integration (FullCalendar)
- [ ] Lead scoring/prioritization
- [ ] Communication history timeline per lead
- [ ] SMS integration (Twilio or similar)

### Phase 5: Application & Vetting 🔧 IN PROGRESS
**What exists:** Application CRUD, screening report upload, SingleKey PDF parsing, approval workflow
**What's missing:**
- [ ] Per-property applicant comparison view (side-by-side)
- [ ] Auto-calculated DTI ratio from parsed data
- [ ] Customizable approval criteria templates
- [ ] Batch approve/deny actions
- [ ] Applicant communication (approval/denial emails)
- [ ] Reference check tracking

### Phase 6: Documents & E-Sign 📋 NOT STARTED
**What's needed:**
- [ ] Lease template builder (variable substitution: tenant name, address, rent amount, dates)
- [ ] Document generation from templates (PDF via @react-pdf/renderer)
- [ ] E-signature flow (embedded signing or DocuSign/HelloSign integration)
- [ ] Document versioning and audit trail
- [ ] Bulk document generation (multiple tenants)
- [ ] Document expiry tracking and renewal reminders

### Phase 7: Payment Collection 📋 NOT STARTED
**What's needed:**
- [ ] Stripe Connect onboarding for landlords
- [ ] Recurring rent invoicing (auto-generate monthly)
- [ ] Payment tracking dashboard (paid/overdue/partial)
- [ ] Late payment reminders (automated)
- [ ] Payment receipts (PDF generation)
- [ ] Security deposit tracking
- [ ] Split payments (roommates)

### Phase 8: Key Handoff 📋 NOT STARTED
**What's needed:**
- [ ] Move-in checklist (customizable per property)
- [ ] Key distribution log (who got which keys, when)
- [ ] Final walkthrough documentation (photos + notes)
- [ ] Transition to active tenancy (status change)
- [ ] Welcome package generation
- [ ] Utility transfer reminders

## Implementation Standards

### Database
- Every table: `id UUID PK`, `company_id UUID FK`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`
- RLS on every table using `get_user_company_id()`
- FK constraints for every join relationship
- Idempotent migrations (IF NOT EXISTS, EXCEPTION WHEN duplicate)
- Always end with `NOTIFY pgrst, 'reload schema'`

### API Routes
```typescript
// EVERY route follows this pattern:
export async function METHOD(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get company_id for multi-tenancy
    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle()
    if (!profile?.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 })

    // Validate input with Zod
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    // Query with company isolation
    const { data, error } = await supabase
        .from('table')
        .select('*')
        .eq('company_id', profile.company_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
```

### Hooks
```typescript
// EVERY hook follows this pattern:
export function useResource() {
    const { companyId } = useCompanyId()
    return useQuery({
        queryKey: ['resource', companyId],
        queryFn: async () => {
            const res = await fetch('/api/resource')
            if (!res.ok) throw new Error(`Failed: ${res.status}`)
            return res.json()
        },
        enabled: !!companyId,
        staleTime: 30_000,
        refetchOnMount: true,
    })
}
```

### Pages
```typescript
// EVERY dashboard page follows this pattern:
'use client'
export default function ResourcePage() {
    const { data, isLoading, error } = useResource()

    if (isLoading) return <PageSkeleton />
    if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />
    if (!data?.length) return <EmptyState title="No resources yet" action={<CreateButton />} />

    return <ResourceList data={data} />
}
```

### Feature Gating
```typescript
// Check plan tier before rendering premium features:
import { FeatureGate } from '@/components/FeatureGate'

<FeatureGate feature="social_media" fallback={<UpgradePrompt />}>
    <SocialMediaDashboard />
</FeatureGate>
```

## Decision Framework
1. **Security first** — RLS, auth checks, input validation, no key exposure
2. **Data integrity** — FK constraints, proper types, no orphaned records
3. **User experience** — Loading states, error states, empty states, toast feedback
4. **Ship it** — 80/20 rule. Functional > perfect. Don't over-engineer.
5. **Verify** — Build passes, Playwright confirms, no console errors

## Known Pitfalls (Avoid These)
- `middleware.ts` → FATAL: use `proxy.ts` only (Next.js 16)
- `.single()` on optional rows → use `.maybeSingle()`
- PostgREST joins without FK → 400 error, use graceful fallback
- Hardcoded admin emails → use env vars
- `'admin'` fallback role → use `'agent'`
- Missing `company_id` in queries → data leak across companies
- Forgetting `NOTIFY pgrst` after FK changes → joins still fail
