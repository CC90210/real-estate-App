import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { PLANS, PlanId } from '@/lib/stripe/plans'
import { rateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-response'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500, prefix: 'api:stripe-checkout' })

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return apiError('Not authenticated', { status: 401 })
        }

        try {
            await limiter.check(5, user.id)
        } catch {
            return apiError('Too many requests', { status: 429 })
        }

        const body = await req.json()
        const planId = body.plan as PlanId

        const plan = PLANS[planId]
        if (!plan) {
            return apiError(`Invalid plan: "${planId}". Valid plans: ${Object.keys(PLANS).join(', ')}`, {
                status: 400,
                code: 'INVALID_PLAN',
            })
        }

        // Get or create Stripe customer
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id, company_id, role')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return apiError('No company found', { status: 403 })
        }

        // Only admins can purchase subscriptions
        if (profile?.role !== 'admin') {
            return apiError('Only company admins can manage billing', { status: 403 })
        }

        let customerId = profile?.stripe_customer_id || undefined

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    user_id: user.id,
                    company_id: profile?.company_id || '',
                },
            })
            customerId = customer.id

            await supabase
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id)
        }

        // Only Brokerage Command gets a 14-day free trial.
        // Agent Pro and Agency Growth pay immediately — incentivizes the top tier.
        const isBrokerageCommand = planId === 'brokerage_command'
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://propflow.pro'

        // Use the real Stripe Price IDs (linked to the products you created in Stripe Dashboard)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sessionParams: any = {
            customer: customerId,
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: plan.stripePriceId, quantity: 1 }],
            subscription_data: {
                metadata: { plan: planId, user_id: user.id, company_id: profile?.company_id || '' },
            },
            success_url: `${appUrl}/dashboard?checkout=success&plan=${planId}`,
            cancel_url: `${appUrl}/pricing?checkout=cancelled`,
            metadata: { plan: planId, user_id: user.id },
        }
        if (isBrokerageCommand) {
            sessionParams.subscription_data.trial_period_days = 14
        }

        const session = await stripe.checkout.sessions.create(sessionParams)

        return NextResponse.json({ url: session.url })

    } catch (error) {
        console.error('Checkout error:', error)
        return apiError('Failed to create checkout session', { status: 500 })
    }
}
