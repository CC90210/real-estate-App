export const PLANS = {
    starter: {
        name: 'Starter',
        description: 'Perfect for independent agents',
        price: {
            monthly: 4900, // $49 in cents
            yearly: 47000, // $470/year (20% discount)
        },
        priceIds: {
            monthly: 'price_starter_monthly', // Replace with actual Stripe price ID
            yearly: 'price_starter_yearly',
        },
        features: [
            'Up to 25 properties',
            '1 team member',
            'Application management',
            'Document generation',
            'Basic reporting',
            'Email support',
        ],
        limits: {
            properties: 25,
            teamMembers: 1,
        },
    },
    professional: {
        name: 'Professional',
        description: 'For growing teams',
        price: {
            monthly: 9900, // $99
            yearly: 95000, // $950/year
        },
        priceIds: {
            monthly: 'price_professional_monthly',
            yearly: 'price_professional_yearly',
        },
        features: [
            'Up to 100 properties',
            '5 team members',
            'Everything in Starter',
            'Showings calendar',
            'Invoice generation',
            'Advanced analytics',
            'Priority support',
            'API access',
        ],
        limits: {
            properties: 100,
            teamMembers: 5,
        },
        popular: true,
    },
    enterprise: {
        name: 'Enterprise',
        description: 'For large organizations',
        price: {
            monthly: 24900, // $249
            yearly: 239000, // $2390/year
        },
        priceIds: {
            monthly: 'price_enterprise_monthly',
            yearly: 'price_enterprise_yearly',
        },
        features: [
            'Unlimited properties',
            'Unlimited team members',
            'Everything in Professional',
            'Custom integrations',
            'Dedicated account manager',
            'SLA guarantee',
            'Custom training',
            'Audit logs',
        ],
        limits: {
            properties: Infinity,
            teamMembers: Infinity,
        },
    },
} as const

export type PlanKey = keyof typeof PLANS
