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

        // Need LATE_API_KEY
        const apiKey = process.env.LATE_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Social media integration is not configured. Please add LATE_API_KEY to your environment variables.' },
                { status: 503 }
            )
        }

        // Get user's profile and company
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, companies(id, name, subscription_plan, late_profile_id)')
            .eq('id', user.id)
            .single()

        const company = Array.isArray(profile?.companies) ? profile.companies[0] : profile?.companies

        if (!company) {
            return NextResponse.json({ error: 'No company found. Please complete your profile setup first.' }, { status: 400 })
        }

        // Check plan limits
        const plan = company.subscription_plan || 'agent_pro'
        const { count } = await supabase
            .from('social_accounts')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', profile?.company_id)
            .eq('status', 'active')

        const planLimits: Record<string, number> = {
            agent_pro: 2, agency_growth: 8, brokerage_command: 999,
            essentials: 2, professional: 8, enterprise: 999,
        }
        const limit = planLimits[plan] || 2
        if ((count || 0) >= limit) {
            return NextResponse.json(
                { error: `Your plan supports up to ${limit} connected platform(s). Upgrade for more.` },
                { status: 403 }
            )
        }

        // ─── Ensure we have a Late profile (create inline, no internal HTTP call) ───
        const Late = (await import('@getlatedev/node')).default
        const late = new Late({ apiKey })

        let lateProfileId = company.late_profile_id

        if (!lateProfileId) {
            try {
                const result = await late.profiles.createProfile({
                    body: {
                        name: company.name || 'PropFlow Agency',
                        description: `Social media profile for ${company.name}`,
                    }
                })

                lateProfileId = result?.data?.profile?._id || result?.data?.profile?.id || result?.profile?._id || result?.profile?.id

                if (lateProfileId) {
                    // Save the Late profile ID
                    await supabase
                        .from('companies')
                        .update({ late_profile_id: lateProfileId })
                        .eq('id', company.id)
                }
            } catch (profileError: any) {
                console.error('Late profile creation failed:', profileError?.message || profileError)

                // Fallback: If we hit a plan limit, try to just use their first existing profile
                try {
                    const listResult = await late.profiles.listProfiles()
                    const profiles = listResult?.data?.profiles || listResult?.profiles || []

                    if (profiles.length > 0) {
                        lateProfileId = profiles[0]._id || profiles[0].id
                        if (lateProfileId) {
                            await supabase
                                .from('companies')
                                .update({ late_profile_id: lateProfileId })
                                .eq('id', company.id)
                        }
                    } else {
                        throw new Error(profileError?.message || 'Profile limit reached but no profiles found.')
                    }
                } catch (fallbackError: any) {
                    return NextResponse.json(
                        { error: `Failed to create social profile: ${profileError?.message || 'Unknown error'}` },
                        { status: 502 }
                    )
                }
            }
        }

        if (!lateProfileId) {
            return NextResponse.json(
                { error: 'Could not create or find a social profile to connect.' },
                { status: 500 }
            )
        }

        // ─── Get OAuth URL from Late ───
        try {
            const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://propflow.pro'}/api/social/callback?platform=${platform}`

            const result = await late.connect.getConnectUrl({
                path: {
                    platform,
                },
                query: {
                    profileId: lateProfileId,
                    redirectUrl,
                }
            })

            const finalAuthUrl = result?.data?.url || result?.url || result?.authUrl || result?.data?.authUrl;

            if (!finalAuthUrl) {
                return NextResponse.json(
                    { error: 'Could not get authorization URL. The platform may be temporarily unavailable.' },
                    { status: 502 }
                )
            }

            return NextResponse.json({ authUrl: finalAuthUrl })
        } catch (connectError: any) {
            console.error('Late connect error:', connectError?.message || connectError)
            return NextResponse.json(
                { error: `Connection failed: ${connectError?.message || 'Could not reach the platform'}` },
                { status: 502 }
            )
        }
    } catch (error: any) {
        console.error('Social connect error:', error)
        return NextResponse.json(
            { error: error?.message || 'Failed to connect. Please try again.' },
            { status: 500 }
        )
    }
}
