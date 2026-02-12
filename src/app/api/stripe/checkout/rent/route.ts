import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { leaseId } = await req.json()

        // 1. Fetch Lease and Landlord's Connect Account
        const { data: lease, error: leaseError } = await supabase
            .from('leases')
            .select('*, property:properties(company_id)')
            .eq('id', leaseId)
            .single()

        if (leaseError || !lease) throw new Error('Lease not found')

        const { data: connectAccount } = await supabase
            .from('stripe_connect_accounts')
            .select('stripe_account_id')
            .eq('company_id', lease.company_id)
            .single()

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
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
