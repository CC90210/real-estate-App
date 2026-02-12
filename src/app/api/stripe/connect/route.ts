import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
            .single()

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

    } catch (error: any) {
        console.error('Connect status error:', error)
        return NextResponse.json({
            connected: false,
            status: 'error',
            error: error.message
        })
    }
}

// POST - Start or continue Connect setup (redirects to onboard)
export async function POST() {
    // Forward to onboard route
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/onboard`, {
        method: 'POST',
    })
    return response
}
