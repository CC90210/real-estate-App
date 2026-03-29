import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api-response'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return apiError('Unauthorized', { status: 401 })

        // Get user's company
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, companies(id, name, late_profile_id)')
            .eq('id', user.id)
            .maybeSingle()

        const company = Array.isArray(profile?.companies) ? profile.companies[0] : profile?.companies
        if (!company) {
            return apiError('No company found. Please complete your profile setup.', { status: 400 })
        }

        // If company already has a Late profile, return it
        if (company.late_profile_id) {
            return NextResponse.json({ profileId: company.late_profile_id })
        }

        // Need LATE_API_KEY to create profile
        const apiKey = process.env.LATE_API_KEY
        if (!apiKey) {
            return apiError(
                'Social media integration is not configured. Please contact support to set up your LATE_API_KEY.',
                { status: 503, code: 'SOCIAL_NOT_CONFIGURED' }
            )
        }

        // Dynamically import Late
        const Late = (await import('@getlatedev/node')).default
        const late = new Late({ apiKey })

        // Create a new Late profile for this company
        const result = await late.profiles.createProfile({
            body: {
                name: company.name || 'PropFlow Agency',
                description: `PropFlow social media for ${company.name}`,
            }
        })

        const lateProfile = result?.data?.profile || result?.profile

        const lateProfileId = lateProfile?._id || lateProfile?.id
        if (!lateProfileId) {
            return apiError('Failed to create social profile with Late. Please try again.', { status: 500 })
        }

        // Save the Late profile ID to the company
        await supabase
            .from('companies')
            .update({ late_profile_id: lateProfileId })
            .eq('id', company.id)

        return NextResponse.json({ profileId: lateProfileId })
    } catch (error: any) {
        console.error('Social profile error:', error)
        return apiError(error?.message || 'Failed to set up social profile. Please try again.', { status: 500 })
    }
}
