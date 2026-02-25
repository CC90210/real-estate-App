import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Admin client for webhook (bypasses RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')!

    let event: Stripe.Event

    try {
        // ✅ USING THE CORRECT VARIABLE NAME FROM VERCEL
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SIGNING_SECRET!  // Matches your Vercel setup
        )
    } catch (error: any) {
        console.error('Webhook signature verification failed:', error.message)
        return NextResponse.json(
            { error: `Webhook Error: ${error.message}` },
            { status: 400 }
        )
    }

    console.log('Received Stripe event:', event.type)

    try {
        switch (event.type) {
            // ====== PROPFLOW SUBSCRIPTION EVENTS ======

            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session

                // Check if this is a Connect payment or subscription
                if (session.mode === 'subscription') {
                    await handleSubscriptionCheckout(session)
                } else if (session.mode === 'payment') {
                    await handleConnectPayment(session)
                }
                break
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription
                await handleSubscriptionUpdate(subscription)
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                await handleSubscriptionCancelled(subscription)
                break
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice
                console.log('Payment succeeded for invoice:', invoice.id)
                break
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice
                console.log('Payment failed for invoice:', invoice.id)
                // Could send email notification to user here
                break
            }

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }

        return NextResponse.json({ received: true })

    } catch (error: any) {
        console.error('Webhook handler error:', error)
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        )
    }
}

// Handle PropFlow subscription checkout completion
async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.user_id
    const plan = session.metadata?.plan

    if (!userId) {
        console.log('No user_id in session metadata')
        return
    }

    console.log(`Processing subscription for user ${userId}, plan: ${plan}`)

    const subscriptionId = session.subscription as string
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    // Get user's company
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .single()

    if (!profile?.company_id) {
        console.log('No company found for user')
        return
    }

    // Update profile with Stripe customer ID
    await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: session.customer as string })
        .eq('id', userId)

    // Update company subscription status
    await supabaseAdmin
        .from('companies')
        .update({
            subscription_status: subscription.status,
            subscription_plan: plan,
            stripe_subscription_id: subscriptionId,
            subscription_current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
        })
        .eq('id', profile.company_id)

    console.log(`Updated company ${profile.company_id} with subscription: ${subscription.status}`)
}

// Handle subscription updates
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const planId = subscription.metadata?.plan
    const { data: company } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .single()

    if (company) {
        const updateData: any = {
            subscription_status: subscription.status,
            subscription_current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        }
        if (planId) {
            updateData.subscription_plan = planId
        }
        await supabaseAdmin
            .from('companies')
            .update(updateData)
            .eq('id', company.id)
    }
}

// Handle subscription cancellation
async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
    const { data: company } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .single()

    if (company) {
        await supabaseAdmin
            .from('companies')
            .update({
                subscription_status: 'cancelled',
                // Explicitly NOT clearing subscription_plan so we know what they had
                updated_at: new Date().toISOString(),
            })
            .eq('id', company.id)
    }
}

// Handle payments from tenants to agents (Stripe Connect)
async function handleConnectPayment(session: Stripe.Checkout.Session) {
    const companyId = session.metadata?.company_id

    if (!companyId) return

    // Update tenant_payments record
    await supabaseAdmin
        .from('tenant_payments')
        .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('stripe_checkout_session_id', session.id)

    console.log(`Payment completed for company ${companyId}`)
}
