import { PLANS, PlanId, Plan } from '@/lib/stripe/plans'

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

    // 2. Check for plan override (non-enterprise)
    if (company.plan_override && PLANS[company.plan_override as PlanId]) {
        return {
            effectivePlan: PLANS[company.plan_override as PlanId],
            planSource: 'override',
            isEnterprise: false,
            subscriptionStatus: 'active',
        }
    }

    // 3. Check for active Stripe subscription
    if (company.subscription_plan && PLANS[company.subscription_plan as PlanId]) {
        return {
            effectivePlan: PLANS[company.subscription_plan as PlanId],
            planSource: 'subscription',
            isEnterprise: false,
            subscriptionStatus: company.subscription_status || 'none',
        }
    }

    // 4. Default — no plan (free/limited)
    return {
        effectivePlan: {
            id: 'none' as keyof typeof PLANS,
            name: 'No Plan',
            tagline: 'Subscribe to unlock PropFlow features.',
            price: 0,
            displayPrice: '$0',
            stripePriceId: null,
            features: { crm: [], finance: [], social: [] },
            limits: {
                properties: 0,
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
        subscriptionStatus: 'none',
    }
}
