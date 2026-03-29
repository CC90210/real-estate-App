import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { rateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-response'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500, prefix: 'api:stripe-portal' })

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return apiError('Unauthorized', { status: 401 })
        }

        try {
            await limiter.check(5, user.id)
        } catch {
            return apiError('Too many requests', { status: 429 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id, role')
            .eq('id', user.id)
            .maybeSingle()

        // Only admins can access billing portal
        if (profile?.role !== 'admin') {
            return apiError('Only company admins can manage billing', { status: 403 })
        }

        if (!profile?.stripe_customer_id) {
            return apiError('No subscription found', { status: 400 })
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?portal=success`,
        })

        return NextResponse.json({ url: session.url })

    } catch (error) {
        return apiError('Failed to create portal session', { status: 500 })
    }
}
