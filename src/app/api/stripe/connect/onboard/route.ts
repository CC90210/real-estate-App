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
            })

            stripeAccountId = account.id

            // Store in DB
            await supabase.from('stripe_connect_accounts').insert({
                company_id: profile.company_id,
                stripe_account_id: stripeAccountId,
            })
        }

        // 4. Create Account Link for onboarding
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/payouts?refresh=true`,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/payouts?success=true`,
            type: 'account_onboarding',
        })

        return NextResponse.json({ url: accountLink.url })

    } catch (err: any) {
        console.error('Stripe Connect error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
