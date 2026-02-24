import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { PLANS, PlanId } from '@/lib/stripe/plans'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const body = await req.json()
        const planId = body.plan as PlanId

        const plan = PLANS[planId]
        if (!plan) {
            return NextResponse.json(
                { error: `Invalid plan: "${planId}". Valid plans: ${Object.keys(PLANS).join(', ')}` },
                { status: 400 }
            )
        }

        // Get or create Stripe customer
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id, company_id')
            .eq('id', user.id)
            .single()

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

        // Create checkout session with dynamic pricing (no coupon logic needed)
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `PropFlow ${plan.name}`,
                            description: plan.tagline,
                        },
                        unit_amount: plan.price,
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            subscription_data: {
                trial_period_days: 14,
                metadata: {
                    plan: planId,
                    user_id: user.id,
                    company_id: profile?.company_id || '',
                },
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success&plan=${planId}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
            metadata: {
                plan: planId,
                user_id: user.id,
            },
        })

        return NextResponse.json({ url: session.url })

    } catch (error: any) {
        console.error('Checkout error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create checkout session' },
            { status: 500 }
        )
    }
}
