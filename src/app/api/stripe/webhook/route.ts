import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createHash } from 'crypto'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { apiError } from '@/lib/api-response'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// Admin client for webhook (bypasses RLS)
const supabaseAdmin = getSupabaseAdmin()

export async function POST(req: Request) {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
        return apiError('Missing stripe-signature header', { status: 400 })
    }

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SIGNING_SECRET!
        )
    } catch (error) {
        console.error('Webhook signature verification failed:', error)
        return apiError('Webhook verification failed', { status: 400 })
    }

    console.log('Received Stripe event:', event.type)

    const newlyRegistered = await registerStripeEvent(event.id, body)

    // Idempotency check: skip already-processed events (Stripe retries on timeout)
    if (!newlyRegistered) {
        console.log(`Skipping duplicate event: ${event.id}`)
        return NextResponse.json({ received: true, duplicate: true })
    }

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
                const subscription = event.data.object as Stripe.Subscription & { current_period_end: number }
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
                const subscriptionId = (invoice as unknown as { subscription: string | null }).subscription
                if (subscriptionId) {
                    const companyResult = await supabaseAdmin
                        .from('companies')
                        .select('id, subscription_status')
                        .eq('stripe_subscription_id', subscriptionId)
                        .maybeSingle()
                    const company = companyResult.data as { id: string; subscription_status: string | null } | null
                    if (company && company.subscription_status === 'past_due') {
                        await supabaseAdmin
                            .from('companies')
                            .update({ subscription_status: 'active', updated_at: new Date().toISOString() })
                            .eq('id', company.id)
                        console.log('[Invoice] Restored subscription to active for company:', company.id)
                    } else {
                        console.log('[Invoice] Payment succeeded for subscription:', subscriptionId)
                    }
                }
                break
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice
                console.log('Payment failed for invoice:', invoice.id)
                const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
                if (customerId) {
                    const profileResult = await supabaseAdmin
                        .from('profiles')
                        .select('company_id')
                        .eq('stripe_customer_id', customerId)
                        .maybeSingle()
                    const profile = profileResult.data as { company_id: string | null } | null
                    if (profile?.company_id) {
                        await supabaseAdmin
                            .from('companies')
                            .update({ subscription_status: 'past_due', updated_at: new Date().toISOString() })
                            .eq('id', profile.company_id)
                    }
                }
                break
            }

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }

        return NextResponse.json({ received: true })

    } catch (error) {
        console.error('Webhook handler error:', error)
        return apiError('Webhook handler failed', { status: 500 })
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

    console.log('[Subscription] Processing checkout completion')

    const subscriptionId = session.subscription as string
    const subscription = await stripe.subscriptions.retrieve(subscriptionId) as unknown as Stripe.Subscription & { current_period_end: number }

    // Get user's company
    const profileResult = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .maybeSingle()
    const profile = profileResult.data as { company_id: string | null } | null

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
            subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('id', profile.company_id)

    console.log('[Subscription] Company subscription updated')
}

// Handle subscription updates
async function handleSubscriptionUpdate(subscription: Stripe.Subscription & { current_period_end: number }) {
    const planId = subscription.metadata?.plan
    const companyResult = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle()
    const company = companyResult.data as { id: string } | null

    if (company) {
        const updateData: any = {
            subscription_status: subscription.status,
            subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
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
    const companyResult = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle()
    const company = companyResult.data as { id: string } | null

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

    console.log('[Payment] Tenant payment completed')
}

async function registerStripeEvent(eventId: string, payload: string) {
    try {
        const payloadHash = sha256(payload)
        const { data, error } = await supabaseAdmin.rpc('register_incoming_webhook_event', {
            p_provider: 'stripe',
            p_event_id: eventId,
            p_payload_hash: payloadHash,
            p_ttl_seconds: 60 * 60 * 24 * 7,
        })

        if (error) {
            throw error
        }

        return Array.isArray(data) ? Boolean(data[0]) : Boolean(data)
    } catch (error) {
        console.warn('Persistent Stripe webhook dedupe unavailable; continuing without durable ledger', error)
        return true
    }
}

function sha256(value: string) {
    return createHash('sha256').update(value).digest('hex')
}
