import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api-response'

// GET - Check Connect status
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ connected: false, status: 'not_authenticated' })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return NextResponse.json({ connected: false, status: 'no_company' })
        }

        // Check if has connect account
        const { data: connectAccount } = await supabase
            .from('stripe_connect_accounts')
            .select('stripe_account_id, onboarding_complete, charges_enabled, payouts_enabled')
            .eq('company_id', profile.company_id)
            .maybeSingle()

        if (!connectAccount?.stripe_account_id) {
            return NextResponse.json({
                connected: false,
                status: 'not_started',
                message: 'Stripe Connect not configured'
            })
        }

        return NextResponse.json({
            connected: connectAccount.onboarding_complete === true,
            status: connectAccount.onboarding_complete ? 'complete' : 'incomplete',
            chargesEnabled: connectAccount.charges_enabled || false,
            payoutsEnabled: connectAccount.payouts_enabled || false,
        })

    } catch (error) {
        console.error('Connect status error:', error)
        return apiError('Failed to create connect account', { status: 500 })
    }
}

// POST - Start or continue Connect setup
// Clients should call /api/stripe/connect/onboard directly.
// This endpoint is kept for backward compatibility and redirects.
export async function POST() {
    return apiError('Use /api/stripe/connect/onboard directly', {
        status: 308,
        headers: { Location: '/api/stripe/connect/onboard' },
    })
}
