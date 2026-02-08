import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover' as any,
    typescript: true,
})

// Plan configurations
export const PLANS = {
    starter: {
        name: 'PropFlow Starter',
        price: 4900, // $49 in cents
        interval: 'month' as const,
        features: [
            'Up to 25 properties',
            '1 team member',
            'Application management',
            'Document generation',
            'Email support',
        ],
        limits: { properties: 25, teamMembers: 1 },
    },
    professional: {
        name: 'PropFlow Professional',
        price: 9900, // $99 in cents
        interval: 'month' as const,
        popular: true,
        features: [
            'Up to 100 properties',
            '5 team members',
            'Everything in Starter',
            'Showings calendar',
            'Invoice generation',
            'Payment processing',
            'Priority support',
        ],
        limits: { properties: 100, teamMembers: 5 },
    },
    enterprise: {
        name: 'PropFlow Enterprise',
        price: 24900, // $249 in cents
        interval: 'month' as const,
        features: [
            'Unlimited properties',
            'Unlimited team members',
            'Everything in Professional',
            'Custom integrations',
            'Dedicated support',
            'Advanced payment processing',
            'SLA guarantee',
        ],
        limits: { properties: Infinity, teamMembers: Infinity },
    },
}

export type PlanKey = keyof typeof PLANS
