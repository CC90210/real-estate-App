import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-response'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500 })

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return apiError('Unauthorized', { status: 401 })

        try {
            await limiter.check(5, user.id)
        } catch {
            return apiError('Too many requests', { status: 429 })
        }

        const { platform } = await req.json()

        // All 13 Late-supported platforms
        const validPlatforms = [
            'twitter', 'instagram', 'facebook', 'linkedin', 'tiktok',
            'youtube', 'pinterest', 'reddit', 'bluesky', 'threads',
            'googlebusiness', 'telegram', 'snapchat'
        ]
        if (!validPlatforms.includes(platform)) {
            return apiError(`Invalid platform: ${platform}`, { status: 400, code: 'INVALID_PLATFORM' })
        }

        // Need LATE_API_KEY
        const apiKey = process.env.LATE_API_KEY
        if (!apiKey) {
            return apiError(
                'Social media integration is not configured. Please add LATE_API_KEY to your environment variables.',
                { status: 503, code: 'SOCIAL_NOT_CONFIGURED' }
            )
        }

        // Get user's profile and company
        const { data: profile } = await supabase
            .from('profiles')
            .select(`
                company_id, 
                company:companies!profiles_company_id_fkey(id, name, subscription_plan, late_profile_id)
            `)
            .eq('id', user.id)
            .maybeSingle()

        const companyData = profile?.company
        const company: any = Array.isArray(companyData) ? companyData[0] : companyData

        if (!company) {
            console.error('[SocialConnect] No company found for profile:', (profile as any)?.id, 'company_id:', (profile as any)?.company_id)
            return apiError('No company found. Please complete your profile setup first.', { status: 400 })
        }

        // Social Media Suite is exclusive to Brokerage Command plan
        const plan = company.subscription_plan || 'agent_pro'
        const socialAllowedPlans = ['brokerage_command', 'enterprise']
        if (!socialAllowedPlans.includes(plan)) {
            return apiError(
                'The Social Media Suite is available exclusively on the Brokerage Command plan. Upgrade to connect social platforms.',
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
                    return apiError(`Failed to create social profile: ${profileError?.message || 'Unknown error'}`, {
                        status: 502,
                    })
                }
            }
        }

        if (!lateProfileId) {
            return apiError('Could not create or find a social profile to connect.', { status: 500 })
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
                return apiError('Could not get authorization URL. The platform may be temporarily unavailable.', {
                    status: 502,
                })
            }

            return NextResponse.json({ authUrl: finalAuthUrl })
        } catch (connectError: any) {
            console.error('Late connect error:', connectError?.message || connectError)
            return apiError(`Connection failed: ${connectError?.message || 'Could not reach the platform'}`, {
                status: 502,
            })
        }
    } catch (error: any) {
        console.error('Social connect error:', error)
        return apiError(error?.message || 'Failed to connect. Please try again.', { status: 500 })
    }
}
