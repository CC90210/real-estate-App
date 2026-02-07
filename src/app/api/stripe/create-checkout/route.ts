import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'
import { PLANS, PlanKey } from '@/lib/stripe/plans'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { planKey, interval } = await req.json() as {
            planKey: PlanKey
            interval: 'monthly' | 'yearly'
        }

        const plan = PLANS[planKey]
        if (!plan) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
        }

        // Get or create Stripe customer
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id, company_id')
            .eq('id', user.id)
            .single()

        let customerId = profile?.stripe_customer_id

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    supabase_user_id: user.id,
                    company_id: profile?.company_id || '',
                },
            })
            customerId = customer.id

            // Save customer ID
            await supabase
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id)
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            billing_address_collection: 'auto',
            line_items: [
                {
                    price: plan.priceIds[interval],
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            allow_promotion_codes: true,
            subscription_data: {
                trial_period_days: 14,
                metadata: {
                    plan: planKey,
                    company_id: profile?.company_id || '',
                },
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
            metadata: {
                user_id: user.id,
                plan: planKey,
            },
        })

        return NextResponse.json({ sessionId: session.id, url: session.url })

    } catch (error: any) {
        console.error('Checkout error:', error)
        return NextResponse.json(
            { error: error.message || 'Checkout failed' },
            { status: 500 }
        )
    }
}
