import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, PLANS, PlanId } from '@/lib/stripe'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const { plan: planId } = await req.json() as { plan: PlanId }

        const plan = PLANS[planId]
        if (!plan) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
        }

        // Get or create customer
        let customerId: string | undefined
        let customerEmail = user?.email

        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('stripe_customer_id')
                .eq('id', user.id)
                .single()

            customerId = profile?.stripe_customer_id || undefined
        }

        // Create or get coupon for first month discount
        const couponId = await getOrCreateFirstMonthCoupon(planId, plan)

        // Create checkout session with INTRODUCTORY PRICING
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            customer_email: !customerId ? customerEmail : undefined,
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `PropFlow ${plan.name}`,
                            description: plan.tagline,
                            metadata: {
                                plan_id: planId,
                            },
                        },
                        unit_amount: plan.regularPrice, // Regular monthly price
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            // DISCOUNT for first month
            discounts: [
                {
                    coupon: couponId,
                },
            ],
            subscription_data: {
                metadata: {
                    plan_id: planId,
                    user_id: user?.id || '',
                },
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success&plan=${planId}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
            metadata: {
                plan_id: planId,
                user_id: user?.id || '',
            },
        })

        return NextResponse.json({ url: session.url })

    } catch (error: any) {
        console.error('Checkout error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// Create or get a coupon for first month discount
async function getOrCreateFirstMonthCoupon(planId: string, plan: any): Promise<string> {
    const couponId = `propflow_${planId}_first_month`

    try {
        // Try to get existing coupon
        await stripe.coupons.retrieve(couponId)
        return couponId
    } catch {
        // Create new coupon if doesn't exist
        const discountAmount = plan.regularPrice - plan.firstMonthPrice

        await stripe.coupons.create({
            id: couponId,
            amount_off: discountAmount,
            currency: 'usd',
            duration: 'once', // Only applies to first month
            name: `${plan.name} - First Month Special`,
            metadata: {
                plan_id: planId,
            },
        })

        return couponId
    }
}
