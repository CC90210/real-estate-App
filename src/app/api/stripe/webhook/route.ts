import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Use service role for webhook (bypasses RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
    const body = await req.text()

    // Check if headers is awaitable or not. Next.js 13+ headers() is async in server components but sync in route handlers in some versions.
    // However, in latest Next.js, headers() is a function that returns headers list.
    const headersList = await headers();
    const signature = headersList.get('stripe-signature')!

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch (error: any) {
        console.error('Webhook signature verification failed:', error.message)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                await handleCheckoutComplete(session)
                break
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription
                await handleSubscriptionChange(subscription)
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                await handleSubscriptionCancelled(subscription)
                break
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice
                await handleInvoicePaid(invoice)
                break
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice
                await handleInvoiceFailed(invoice)
                break
            }
        }

        return NextResponse.json({ received: true })

    } catch (error) {
        console.error('Webhook handler error:', error)
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
    }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.user_id
    const plan = session.metadata?.plan

    if (!userId) return

    // Update company subscription status
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .single()

    if (profile?.company_id) {
        await supabaseAdmin
            .from('companies')
            .update({
                subscription_status: 'trialing',
                // subscription_plan: plan, // Mapping needed if column exists, or rely on subscription_tier if compatible
                stripe_subscription_id: session.subscription as string,
            })
            .eq('id', profile.company_id)
    }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string

    // Find company by Stripe customer ID
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('stripe_customer_id', customerId)
        .single()

    if (!profile?.company_id) return

    const status = subscription.status
    const plan = subscription.metadata?.plan || 'starter'

    await supabaseAdmin
        .from('companies')
        .update({
            subscription_status: status,
            // subscription_plan: plan,
            stripe_subscription_id: subscription.id,
            subscription_current_period_end: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null,
        })
        .eq('id', profile.company_id)
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('stripe_customer_id', customerId)
        .single()

    if (!profile?.company_id) return

    await supabaseAdmin
        .from('companies')
        .update({
            subscription_status: 'cancelled',
            // subscription_plan: null,
        })
        .eq('id', profile.company_id)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
    // Log successful payment
    console.log('Invoice paid:', invoice.id)
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
    // Handle failed payment - notify user
    console.log('Invoice failed:', invoice.id)
}
