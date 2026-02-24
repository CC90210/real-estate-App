import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { platform } = await req.json()

        // All 13 Late-supported platforms
        const validPlatforms = [
            'twitter', 'instagram', 'facebook', 'linkedin', 'tiktok',
            'youtube', 'pinterest', 'reddit', 'bluesky', 'threads',
            'googlebusiness', 'telegram', 'snapchat'
        ]
        if (!validPlatforms.includes(platform)) {
            return NextResponse.json({ error: `Invalid platform: ${platform}` }, { status: 400 })
        }

        // Get user's profile and company
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, companies(id, subscription_plan, late_profile_id)')
            .eq('id', user.id)
            .single()

        const company = Array.isArray(profile?.companies) ? profile.companies[0] : profile?.companies

        if (!company) {
            return NextResponse.json({ error: 'No company found' }, { status: 400 })
        }

        // Check plan limits
        const plan = company.subscription_plan || 'agent_pro'
        const { count } = await supabase
            .from('social_accounts')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', profile?.company_id)
            .eq('status', 'active')

        const planLimits: Record<string, number> = {
            agent_pro: 2,
            agency_growth: 8,
            brokerage_command: 999,
            essentials: 2,
            professional: 8,
            enterprise: 999,
        }

        const limit = planLimits[plan] || 2
        if ((count || 0) >= limit) {
            return NextResponse.json(
                { error: `Your plan supports up to ${limit} connected platform(s). Upgrade for more.` },
                { status: 403 }
            )
        }

        // Ensure we have a Late profile ID — create one if missing
        let lateProfileId = company.late_profile_id

        if (!lateProfileId) {
            // Auto-create the Late profile
            const profileRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/social/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': req.headers.get('cookie') || '',
                },
            })
            const profileData = await profileRes.json()

            if (profileData.error) {
                return NextResponse.json({ error: profileData.error }, { status: profileRes.status })
            }

            lateProfileId = profileData.profileId
        }

        if (!lateProfileId) {
            return NextResponse.json(
                { error: 'Could not set up your social profile. Please ensure LATE_API_KEY is configured.' },
                { status: 500 }
            )
        }

        // Need LATE_API_KEY
        const apiKey = process.env.LATE_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Social media integration is not configured. Please add LATE_API_KEY to your environment.' },
                { status: 503 }
            )
        }

        // Get OAuth URL from Late
        const Late = (await import('@getlatedev/node')).default
        const late = new Late({ apiKey })

        const result = await late.connect.getConnectUrl({
            platform,
            profileId: lateProfileId,
            redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/social/callback?platform=${platform}`,
        })

        if (!result?.authUrl) {
            return NextResponse.json(
                { error: 'Failed to get OAuth URL from Late. The platform may be temporarily unavailable.' },
                { status: 502 }
            )
        }

        return NextResponse.json({ authUrl: result.authUrl })
    } catch (error: any) {
        console.error('Social connect error:', error)
        return NextResponse.json(
            { error: error?.message || 'Failed to initiate connection. Please try again.' },
            { status: 500 }
        )
    }
}
