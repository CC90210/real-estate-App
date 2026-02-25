import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { PLANS, PlanId } from '@/lib/stripe/plans'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { newPlan } = await req.json() as { newPlan: PlanId }

        if (!PLANS[newPlan]) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
        }

        // Get the company's current subscription
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, companies(stripe_subscription_id, subscription_plan, plan_override)')
            .eq('id', user.id)
            .single()

        const company = profile?.companies as any

        // If they have a plan_override (enterprise deal), they can't self-upgrade via Stripe
        if (company?.plan_override) {
            return NextResponse.json({
                error: 'Your plan is managed by PropFlow. Contact support to change your plan.',
            }, { status: 403 })
        }

        // If they have an existing Stripe subscription, update it (prorate)
        if (company?.stripe_subscription_id) {
            const subscription = await stripe.subscriptions.retrieve(company.stripe_subscription_id)
            const currentItem = subscription.items.data[0]

            // Update the subscription to the new plan's price
            const updatedSubscription = await stripe.subscriptions.update(company.stripe_subscription_id, {
                items: [{
                    id: currentItem.id,
                    price_data: {
                        currency: 'usd',
                        unit_amount: PLANS[newPlan].price,
                        recurring: { interval: 'month' },
                        product: 'prod_placeholder', // Dummy product since we must pass something
                    } as any,
                }],
                proration_behavior: 'create_prorations',
                metadata: {
                    plan: newPlan,
                    user_id: user.id,
                    company_id: profile?.company_id || '',
                },
            })

            // Update the company's plan in our database immediately
            await supabase
                .from('companies')
                .update({
                    subscription_plan: newPlan,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', profile?.company_id)

            return NextResponse.json({
                success: true,
                newPlan,
                subscriptionId: updatedSubscription.id,
                message: `Upgraded to ${PLANS[newPlan].name}. Your billing has been prorated.`,
            })
        }

        // If they DON'T have a subscription (new checkout), create one
        const { data: profileData } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single()

        let customerId = profileData?.stripe_customer_id

        if (!customerId) {
            try {
                const customer = await stripe.customers.create({
                    email: user.email,
                    metadata: { user_id: user.id, company_id: profile?.company_id || '' },
                })
                customerId = customer.id
                await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
            } catch (err) {
                console.error('Could not create stripe customer:', err)
            }
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `PropFlow ${PLANS[newPlan].name}`,
                        description: PLANS[newPlan].tagline,
                    },
                    unit_amount: PLANS[newPlan].price,
                    recurring: { interval: 'month' },
                },
                quantity: 1,
            }],
            mode: 'subscription',
            subscription_data: {
                trial_period_days: 14,
                metadata: {
                    plan: newPlan,
                    user_id: user.id,
                    company_id: profile?.company_id || '',
                },
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?upgraded=${newPlan}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=billing&cancelled=true`,
        })

        return NextResponse.json({ url: session.url })
    } catch (error: any) {
        console.error('Upgrade error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
