export type PlanId = 'agent_pro' | 'agency_growth' | 'brokerage_command'

export interface Plan {
    id: PlanId
    name: string
    tagline: string
    price: number          // Monthly in cents
    displayPrice: string   // For UI display
    popular?: boolean
    features: {
        crm: string[]
        finance: string[]
        social: string[]
    }
    limits: {
        properties: number   // -1 = unlimited
        teamMembers: number  // -1 = unlimited
        socialPlatforms: number // -1 = unlimited
        showings: boolean
        invoices: boolean
        analytics: boolean
        automations: boolean
        paymentProcessing: boolean
        customIntegrations: boolean
    }
}

export const PLANS: Record<PlanId, Plan> = {
    agent_pro: {
        id: 'agent_pro',
        name: 'Agent Pro',
        tagline: 'Core tools for solo agents & landlords starting their journey.',
        price: 14900,   // $149/month
        displayPrice: '$149',
        features: {
            crm: [
                'Up to 25 Properties',
                '1 Team Member',
                'Application Management',
            ],
            finance: [
                'Basic Reporting',
                'Digital Rent Collection',
                'Expense Tracking',
            ],
            social: [
                'Basic Social Connector',
                '1 Connected Platform',
            ],
        },
        limits: {
            properties: 25,
            teamMembers: 1,
            socialPlatforms: 1,
            showings: false,
            invoices: false,
            analytics: false,
            automations: false,
            paymentProcessing: false,
            customIntegrations: false,
        },
    },
    agency_growth: {
        id: 'agency_growth',
        name: 'Agency Growth',
        tagline: 'Streamlined compliance & paperwork for growing portfolios.',
        price: 28900,   // $289/month
        displayPrice: '$289',
        popular: true,
        features: {
            crm: [
                'Up to 100 Properties',
                '5 Team Members',
                'Automated Lease Drafting',
            ],
            finance: [
                'Advanced Analytics',
                'Automated Invoicing',
                'Custom Fee Structures',
            ],
            social: [
                'Multi-account Scheduling',
                'Up to 5 Connected Platforms',
            ],
        },
        limits: {
            properties: 100,
            teamMembers: 5,
            socialPlatforms: 5,
            showings: true,
            invoices: true,
            analytics: true,
            automations: true,
            paymentProcessing: true,
            customIntegrations: false,
        },
    },
    brokerage_command: {
        id: 'brokerage_command',
        name: 'Brokerage Command',
        tagline: 'Full operational command for large organizations.',
        price: 49900,   // $499/month
        displayPrice: '$499',
        features: {
            crm: [
                'Unlimited Properties',
                'Unlimited Team Members',
                'Dedicated Account Manager',
            ],
            finance: [
                'Full General Ledger',
                'Priority Capital Access',
                'Brokerage Commission Splits',
            ],
            social: [
                'Unlimited Platforms',
                'White-labeled Social Suite',
            ],
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
    },
}

// Helper to get plan by ID
export function getPlan(planId: string): Plan | undefined {
    return PLANS[planId as PlanId]
}

// Helper to check if feature is available
export function canAccess(planId: string, feature: string): boolean {
    const plan = getPlan(planId)
    if (!plan) return false
    const allFeatures = [...plan.features.crm, ...plan.features.finance, ...plan.features.social]
    return allFeatures.some(f => f.toLowerCase().includes(feature.toLowerCase()))
}

// Helper to check if within a numeric limit
export function isWithinLimit(planId: string, limitKey: 'properties' | 'teamMembers' | 'socialPlatforms', current: number): boolean {
    const plan = getPlan(planId)
    if (!plan) return false
    const limit = plan.limits[limitKey]
    return limit === -1 || current < limit
}

// Helper to check if a boolean feature is available
export function hasFeature(planId: string, feature: keyof Omit<Plan['limits'], 'properties' | 'teamMembers' | 'socialPlatforms'>): boolean {
    const plan = getPlan(planId)
    if (!plan) return false
    return !!plan.limits[feature]
}

// Helper to get numeric limit value
export function getLimit(planId: string, limit: 'properties' | 'teamMembers' | 'socialPlatforms'): number {
    const plan = getPlan(planId)
    if (!plan) return 0
    return plan.limits[limit]
}
