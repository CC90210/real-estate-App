import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { platform } = await req.json()

        // Validate platform
        const validPlatforms = [
            'twitter', 'instagram', 'facebook', 'linkedin', 'tiktok',
            'youtube', 'pinterest', 'reddit', 'bluesky', 'threads',
            'googlebusiness', 'telegram', 'snapchat'
        ]
        if (!validPlatforms.includes(platform)) {
            return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
        }

        // Check plan limits
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, companies(subscription_plan)')
            .eq('id', user.id)
            .single()

        const company = profile?.companies as any
        const plan = company?.subscription_plan || 'agent_pro'

        // Count existing connected accounts
        const { count } = await supabase
            .from('social_accounts')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', profile?.company_id)
            .eq('status', 'active')

        const planLimits: Record<string, number> = {
            agent_pro: 1,
            agency_growth: 5,
            brokerage_command: 999,
        }

        const limit = planLimits[plan] || 1
        if ((count || 0) >= limit) {
            return NextResponse.json(
                { error: `Your ${plan} plan supports up to ${limit} connected platform(s). Upgrade to connect more.` },
                { status: 403 }
            )
        }

        // Get the company's Late profile ID
        const { data: companyData } = await supabase
            .from('companies')
            .select('late_profile_id')
            .eq('id', profile?.company_id)
            .single()

        if (!companyData?.late_profile_id) {
            return NextResponse.json({ error: 'Social profile not set up. Please try again.' }, { status: 400 })
        }

        // Dynamically import Late
        const Late = (await import('@getlatedev/node')).default
        const apiKey = process.env.LATE_API_KEY
        if (!apiKey) return NextResponse.json({ error: 'Social media integration not configured' }, { status: 503 })
        const late = new Late({ apiKey })

        // Get OAuth URL from Late
        const result = await (late as any).connect.getConnectUrl({
            platform,
            profileId: companyData.late_profile_id,
            redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social/callback?platform=${platform}`,
        })

        return NextResponse.json({ authUrl: result?.authUrl })
    } catch (error: any) {
        console.error('Social connect error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
