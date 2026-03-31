import { PLANS, PlanId, Plan } from '@/lib/stripe/plans'

// Alias map: DB may store legacy IDs (essentials/professional/enterprise) from the old plan system.
// Both sets resolve to the same canonical plan configs in @/lib/stripe/plans.
const PLAN_ALIASES: Record<string, PlanId> = {
    essentials: 'agent_pro',
    professional: 'agency_growth',
    enterprise: 'brokerage_command',
}

function normalizePlanId(raw: string): PlanId | undefined {
    if (raw in PLANS) return raw as PlanId
    if (raw in PLAN_ALIASES) return PLAN_ALIASES[raw]
    return undefined
}

export const ENTERPRISE_PLAN: Plan = {
    id: 'enterprise' as keyof typeof PLANS, // Casting to satisfy type if needed, or we just type it as Plan
    name: 'Enterprise',
    tagline: 'Custom enterprise deployment with unlimited access.',
    price: 0,
    displayPrice: 'Custom',
    stripePriceId: null,
    features: {
        crm: ['Unlimited Properties', 'Unlimited Team Members', 'Dedicated Account Manager', 'Custom Integrations'],
        finance: ['Full General Ledger', 'Priority Capital Access', 'Brokerage Commission Splits', 'Custom Reports'],
        social: ['Unlimited Platforms', 'White-labeled Social Suite', 'Priority API Access'],
    },
    limits: {
        properties: -1,
        teamMembers: -1,
        socialPlatforms: -1,
        showings: true,
        invoices: true,
        analytics: true,
        automations: true,
        paymentProcessing: true,
        customIntegrations: true,
    },
}

export interface CompanyPlanInfo {
    effectivePlan: Plan
    planSource: 'override' | 'subscription' | 'default'
    isEnterprise: boolean
    subscriptionStatus: string
}

export function resolveCompanyPlan(company: {
    plan_override?: string | null
    subscription_plan?: string | null
    subscription_status?: string | null
    is_lifetime_access?: boolean | null
}): CompanyPlanInfo {
    // 1. Check for enterprise override or lifetime access
    if (company.plan_override === 'enterprise' || company.is_lifetime_access) {
        return {
            effectivePlan: ENTERPRISE_PLAN,
            planSource: 'override',
            isEnterprise: true,
            subscriptionStatus: 'active',
        }
    }

    // 2. Check for plan override (non-enterprise). Accepts both new IDs (agent_pro) and
    //    legacy IDs (essentials) via normalizePlanId.
    const overridePlanId = company.plan_override ? normalizePlanId(company.plan_override) : undefined
    if (overridePlanId) {
        return {
            effectivePlan: PLANS[overridePlanId],
            planSource: 'override',
            isEnterprise: false,
            subscriptionStatus: 'active',
        }
    }

    // 3. Check for active Stripe subscription (cancelled subscriptions get no access).
    //    Accepts both new IDs (agency_growth) and legacy IDs (professional).
    const subscriptionPlanId = company.subscription_plan ? normalizePlanId(company.subscription_plan) : undefined
    if (subscriptionPlanId) {
        if (company.subscription_status === 'cancelled') {
            // Fall through to default — cancelled means no active entitlement
        } else {
            return {
                effectivePlan: PLANS[subscriptionPlanId],
                planSource: 'subscription',
                isEnterprise: false,
                subscriptionStatus: company.subscription_status || 'none',
            }
        }
    }

    // 4. Trialing users (signed up but haven't picked a plan yet) get Agent Pro features.
    //    This lets new users explore the platform immediately after signup.
    if (company.subscription_status === 'trialing') {
        return {
            effectivePlan: PLANS.agent_pro,
            planSource: 'default',
            isEnterprise: false,
            subscriptionStatus: 'trialing',
        }
    }

    // 5. Default — no plan, no trial (expired or never started)
    return {
        effectivePlan: {
            id: 'none' as keyof typeof PLANS,
            name: 'No Plan',
            tagline: 'Subscribe to unlock PropFlow features.',
            price: 0,
            displayPrice: '$0',
            stripePriceId: null,
            features: { crm: ['Up to 3 Properties (read-only)'], finance: [], social: [] },
            limits: {
                properties: 3,
                teamMembers: 1,
                socialPlatforms: 0,
                showings: false,
                invoices: false,
                analytics: false,
                automations: false,
                paymentProcessing: false,
                customIntegrations: false,
            },
        },
        planSource: 'default',
        isEnterprise: false,
        subscriptionStatus: company.subscription_status || 'none',
    }
}
