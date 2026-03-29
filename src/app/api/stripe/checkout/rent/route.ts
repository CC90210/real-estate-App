import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-response'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500, prefix: 'api:stripe-checkout-rent' })

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return apiError('Unauthorized', { status: 401 })

    try {
        await limiter.check(3, user.id)
    } catch {
        return apiError('Too many payment attempts. Please wait a moment.', { status: 429 })
    }

    try {
        const { leaseId } = await req.json()

        // 1. Fetch Lease — only allow if tenant is on this lease
        const { data: lease, error: leaseError } = await supabase
            .from('leases')
            .select('*, property:properties(company_id, address)')
            .eq('id', leaseId)
            .eq('tenant_id', user.id)
            .maybeSingle()

        if (leaseError || !lease) throw new Error('Lease not found or not yours')

        const { data: connectAccount } = await supabase
            .from('stripe_connect_accounts')
            .select('stripe_account_id')
            .eq('company_id', lease.company_id)
            .maybeSingle()

        if (!connectAccount?.stripe_account_id) {
            throw new Error('Landlord has not set up payouts yet.')
        }

        // 2. Create Stripe Checkout Session
        // Note: Using "destination" for Direct Charges or "transfer_data" for Destination Charges.
        // We'll use Destination Charges to collect an application fee.

        const platformFee = Math.round(lease.rent_amount * 0.015 * 100) // 1.5% platform fee example (in cents)

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Rent Payment - ${lease.property?.address || 'Property'}`,
                            description: `Rent for period ending ${lease.end_date}`,
                        },
                        unit_amount: Math.round(lease.rent_amount * 100), // in cents
                    },
                    quantity: 1,
                },
            ],
            payment_intent_data: {
                application_fee_amount: platformFee,
                transfer_data: {
                    destination: connectAccount.stripe_account_id,
                },
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/tenant/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/tenant/dashboard?payment=cancelled`,
            customer_email: user.email,
            metadata: {
                lease_id: lease.id,
                tenant_id: user.id,
                type: 'rent_payment'
            }
        })

        return NextResponse.json({ url: session.url })

    } catch (err: any) {
        console.error('Rent checkout error:', err)
        return apiError('Payment session creation failed', { status: 500 })
    }
}
