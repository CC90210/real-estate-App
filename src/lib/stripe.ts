import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
    if (!_stripe) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY is not set')
        }
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2026-01-28.clover' as any,
            typescript: true,
        })
    }
    return _stripe
}

/** @deprecated Use getStripe() instead — this export will throw at module load if STRIPE_SECRET_KEY is missing */
export const stripe = (() => {
    if (process.env.STRIPE_SECRET_KEY) {
        return new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2026-01-28.clover' as any,
            typescript: true,
        })
    }
    // Return a proxy that throws on usage if key is missing at module load
    return new Proxy({} as Stripe, {
        get(_, prop) {
            if (prop === 'then') return undefined // Allow promise checks
            throw new Error('STRIPE_SECRET_KEY is not set')
        }
    })
})()

// Plan configurations
export * from './stripe/plans'
