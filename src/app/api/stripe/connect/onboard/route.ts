import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 1. Get user company
    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, companies(name, email)')
        .eq('id', user.id)
        .single()

    if (!profile?.company_id) {
        return NextResponse.json({ error: 'Company not found' }, { status: 400 })
    }

    try {
        // 2. Check if already has a Connect ID
        const { data: existing } = await supabase
            .from('stripe_connect_accounts')
            .select('stripe_account_id')
            .eq('company_id', profile.company_id)
            .maybeSingle()

        let stripeAccountId = existing?.stripe_account_id

        // 3. Create Connect Account if none exists
        if (!stripeAccountId) {
            try {
                const account = await stripe.accounts.create({
                    type: 'express',
                    country: 'US',
                    email: (profile.companies as any)?.email || user.email,
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true },
                    },
                    business_profile: {
                        name: (profile.companies as any)?.name,
                        url: process.env.NEXT_PUBLIC_APP_URL,
                    },
                    // Add tos_acceptance if possible, or leave it for the onboarding flow
                })

                stripeAccountId = account.id

                // Store in DB
                await supabase.from('stripe_connect_accounts').insert({
                    company_id: profile.company_id,
                    stripe_account_id: stripeAccountId,
                })
            } catch (err: any) {
                // HANDLE SPECIFIC PLATFORM ERROR
                if (err.message.includes('responsibilities of managing losses')) {
                    return NextResponse.json({
                        error: 'Stripe Platform Profile Incomplete: Please log in to your Stripe Dashboard and complete the "Connect Platform Profile" settings to accept responsibility for managing losses.'
                    }, { status: 400 })
                }
                throw err
            }
        }

        // 4. Create Account Link for onboarding
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=payouts&refresh=true`,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=payouts&success=true`,
            type: 'account_onboarding',
        })

        return NextResponse.json({ url: accountLink.url })

    } catch (err: any) {
        console.error('Stripe Connect error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
export async function GET(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

    if (!profile?.company_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: connect } = await supabase
        .from('stripe_connect_accounts')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle()

    if (!connect?.stripe_account_id) return NextResponse.json({ error: 'No account' }, { status: 404 })

    try {
        const account = await stripe.accounts.retrieve(connect.stripe_account_id)

        const updateData = {
            details_submitted: account.details_submitted,
            payouts_enabled: account.payouts_enabled,
            charges_enabled: account.charges_enabled,
            updated_at: new Date().toISOString()
        }

        await supabase
            .from('stripe_connect_accounts')
            .update(updateData)
            .eq('company_id', profile.company_id)

        return NextResponse.json({ success: true, status: updateData })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
