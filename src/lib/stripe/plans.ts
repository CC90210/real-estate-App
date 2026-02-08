export const PLANS = {
    essentials: {
        id: 'essentials',
        name: 'Essentials',
        tagline: 'Core tools for solo agents & landlords starting their journey.',

        // Pricing (in cents)
        firstMonthPrice: 900,      // $9 first month
        regularPrice: 2900,        // $29/month after

        // Limits
        limits: {
            properties: 25,
            teamMembers: 1,
            // Feature access
            showingsCalendar: false,
            invoiceGeneration: false,
            advancedAnalytics: false,
            automations: false,
            paymentProcessing: false,
            customIntegrations: false,
        },

        // Display features
        features: [
            'Up to 25 Properties',
            '1 Team Member',
            'Application Management',
            'Document Generation',
            'Basic Reporting',
            'Email Support',
        ],
    },

    professional: {
        id: 'professional',
        name: 'Professional',
        tagline: 'Streamlined compliance & paperwork for growing portfolios.',
        popular: true,

        firstMonthPrice: 1900,     // $19 first month
        regularPrice: 4900,        // $49/month after

        limits: {
            properties: 100,
            teamMembers: 5,
            showingsCalendar: true,
            invoiceGeneration: true,
            advancedAnalytics: true,
            automations: true,        // Can purchase add-on
            paymentProcessing: true,  // Can enable Stripe Connect
            customIntegrations: false,
        },

        features: [
            'Up to 100 Properties',
            '5 Team Members',
            'Everything in Essentials',
            'Showings Calendar',
            'Invoice Generation',
            'Advanced Analytics',
        ],
    },

    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        tagline: 'Full operational command for large organizations.',

        firstMonthPrice: 3900,     // $39 first month
        regularPrice: 7900,        // $79/month after

        limits: {
            properties: Infinity,
            teamMembers: Infinity,
            showingsCalendar: true,
            invoiceGeneration: true,
            advancedAnalytics: true,
            automations: true,
            paymentProcessing: true,
            customIntegrations: true,
        },

        features: [
            'Unlimited Properties',
            'Unlimited Team Members',
            'Everything in Professional',
            'Custom Integrations',
            'Dedicated Account Manager',
            'Priority Support & SLA',
        ],
    },
} as const

export type PlanId = keyof typeof PLANS
export type Plan = typeof PLANS[PlanId]

// Helper to get plan by ID
export function getPlan(planId: string): Plan | null {
    return PLANS[planId as PlanId] || null
}

// Helper to check if feature is available
export function hasFeature(planId: string, feature: keyof Plan['limits']): boolean {
    const plan = getPlan(planId)
    if (!plan) return false
    return !!plan.limits[feature]
}

// Helper to get limit value
export function getLimit(planId: string, limit: 'properties' | 'teamMembers'): number {
    const plan = getPlan(planId)
    if (!plan) return 0
    return plan.limits[limit]
}
