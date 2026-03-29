import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { PLANS, PlanId } from '@/lib/stripe/plans'
import { rateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-response'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500, prefix: 'api:stripe-upgrade' })

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return apiError('Unauthorized', { status: 401 })

        try {
            await limiter.check(5, user.id)
        } catch {
            return apiError('Too many requests', { status: 429 })
        }

        const { newPlan } = await req.json() as { newPlan: PlanId }
        const planConfig = PLANS[newPlan]

        if (!planConfig) {
            return apiError('Invalid plan', { status: 400, code: 'INVALID_PLAN' })
        }

        if (!planConfig.stripePriceId || planConfig.stripePriceId.includes('placeholder')) {
            return apiError('Stripe products not configured. Please add real price IDs to plans.ts', {
                status: 501,
                code: 'STRIPE_NOT_CONFIGURED',
            })
        }

        // Get the user's profile + company subscription info
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, role, companies(stripe_subscription_id, subscription_plan, plan_override)')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return apiError('No company found', { status: 403 })
        }

        // Only admins can change the company's subscription plan
        if (profile.role !== 'admin') {
            return apiError('Only company admins can manage billing', { status: 403 })
        }

        const companies = profile?.companies as unknown as { stripe_subscription_id: string | null; subscription_plan: string | null; plan_override: string | null }[] | null
        const company = Array.isArray(companies) ? companies[0] ?? null : null

        // If they have a plan_override (enterprise deal), they can't self-upgrade via Stripe
        if (company?.plan_override) {
            return apiError('Your plan is managed by PropFlow. Contact support to change your plan.', {
                status: 403,
            })
        }

        // If they have an existing Stripe subscription, update it (prorate)
        if (company?.stripe_subscription_id) {
            const subscription = await stripe.subscriptions.retrieve(company.stripe_subscription_id)
            const currentItem = subscription.items.data[0]

            // Update the subscription to the new plan's price
            const updatedSubscription = await stripe.subscriptions.update(company.stripe_subscription_id, {
                items: [{
                    id: currentItem.id,
                    price: planConfig.stripePriceId,
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
            .maybeSingle()

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
                price: planConfig.stripePriceId,
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
    } catch (error) {
        console.error('Upgrade error:', error)
        return apiError('Upgrade failed', { status: 500 })
    }
}
