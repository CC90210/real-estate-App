---
description: Comprehensive implementation plan for PropFlow's tiered pricing structure and business logic.
...

# PropFlow Pricing & Tier Implementation Plan

## 1. Business Logic & Tier Definitions

We will implement a 3-Tier Subscription Model + Automation Add-on to maximize conversion and upsell potential.

### **Tier 1: Essentials (CRM Focus)**
*   **Target:** Individual Agents / Small Landlords
*   **Price:** $29/month
*   **Features:**
    *   Property Management (Unlimited)
    *   Tenant/Landlord CRM
    *   Basic Dashboard Analytics
    *   *Restriction:* No Document Generation, No Invoice Creation, No Showings.

### **Tier 2: Professional (Docs & Workflow)**
*   **Target:** Growing Agencies
*   **Price:** $49/month
*   **Features:**
    *   **Everything in Tier 1**
    *   **Document Generation** (Leases, Notices, Applications)
    *   Application Management
    *   *Restriction:* No Invoicing, No Showings module.

### **Tier 3: Business Elite (Full Suite)**
*   **Target:** Established Brokerages
*   **Price:** $79/month
*   **Features:**
    *   **Everything in Tier 2**
    *   **Invoicing & Financial Ledger**
    *   Showings Management
    *   Approvals Workflows
    *   Team Activity Logs

### **Add-on: Automation Suite (The Upsell)**
*   **Target:** High-Volume Power Users
*   **Price:** Custom / +$99/mo
*   **Features:**
    *   Automated Invoice Dispatch (N8N)
    *   Automated Document Sending
    *   Email Campaigns
    *   Priority Support

---

## 2. Technical Implementation Steps

### Phase 1: Database Migration
We need to update the `companies` table to track subscription status.

**SQL Script (`supabase/migrations/20260207_tiered_pricing.sql`):**
```sql
-- Add Tier Column
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'tier_1' CHECK (subscription_tier IN ('tier_1', 'tier_2', 'tier_3', 'enterprise'));

-- Add Automation Upsell Flag
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS automation_enabled BOOLEAN DEFAULT FALSE;

-- Add Permissions (RLS remains same, logic handled in app)
```

### Phase 2: Feature Guard Implementation
Create a reusable HOC or Hook to enforce tier limits.

**`src/lib/auth/TierGuard.tsx`:**
*   Checks user's company tier.
*   Renders children if allowed.
*   Renders `<UpgradePrompt />` overlay/redirect if blocked.

**Tier Capability Map:**
```typescript
export const TIER_CAPABILITIES = {
  tier_1: ['properties', 'contacts', 'dashboard'],
  tier_2: ['properties', 'contacts', 'dashboard', 'documents', 'applications'],
  tier_3: ['properties', 'contacts', 'dashboard', 'documents', 'applications', 'invoices', 'showings', 'approvals'],
  enterprise: ['all']
}
```

### Phase 3: UI Updates

#### A. Lock Restricted Pages
*   **Invoices Page:** Wrap in `TierGuard` (Min Tier: 3).
*   **Documents Page:** Wrap in `TierGuard` (Min Tier: 2).
*   **Showings Page:** Wrap in `TierGuard` (Min Tier: 3).
*   **Automations Tab:** Show "Upsell" landing page state if `automation_enabled` is false.

#### B. Pricing Page (`/pricing`)
*   Create a clean, psychology-driven pricing table.
*   Highlight "Best Value".
*   "Contact Sales" for Automation Upsell.

---

## 3. Deployment Strategy (Turbo-Flow)
- [x] **Phase 1: Database & Core Logic**
  - [x] Create migration for `subscription_tier` and `automation_enabled`.
  - [x] Update `capabilities.ts` with tiers and feature guards.
  - [x] Create `TierGuard` component.

- [x] **Phase 2: Page Protection**
  - [x] Protect `InvoicesPage`.
  - [x] Protect `DocumentsPage`.
  - [x] Protect `ShowingsPage`.
  - [x] Protect/Upsell `AutomationsPage`.

- [x] **Phase 3: Public & Settings Pages**
  - [x] Create `/pricing` page with 3 tiers + automation upsell.
  - [x] Create `/settings/billing` page to view current plan.

- [x] **Phase 4: Verification**
  - [x] Verify `TierGuard` logic.
  - [x] Verify UI for locked states.
