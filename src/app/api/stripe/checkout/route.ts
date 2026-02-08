import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, PLANS, PlanKey } from '@/lib/stripe'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const { plan: planKey } = await req.json() as { plan: PlanKey }

        const plan = PLANS[planKey]
        if (!plan) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
        }

        // Get or create customer
        let customerEmail = user?.email
        let customerId: string | undefined

        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('stripe_customer_id')
                .eq('id', user.id)
                .single()

            customerId = profile?.stripe_customer_id || undefined
        }

        // Create checkout session with dynamic pricing
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            customer_email: !customerId ? customerEmail : undefined,
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: plan.name,
                            description: `${plan.name} - Monthly Subscription`,
                        },
                        unit_amount: plan.price,
                        recurring: {
                            interval: plan.interval,
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            subscription_data: {
                trial_period_days: 14,
                metadata: {
                    plan: planKey,
                    user_id: user?.id || '',
                },
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success&plan=${planKey}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
            metadata: {
                plan: planKey,
                user_id: user?.id || '',
            },
        })

        return NextResponse.json({ url: session.url })

    } catch (error: any) {
        console.error('Checkout error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
