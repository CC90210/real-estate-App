import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Dynamically import Late to avoid build-time errors
        const Late = (await import('@getlatedev/node')).default
        const apiKey = process.env.LATE_API_KEY
        if (!apiKey) return NextResponse.json({ error: 'Social media integration not configured' }, { status: 503 })
        const late = new Late({ apiKey })

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, companies(id, name, late_profile_id)')
            .eq('id', user.id)
            .single()

        const company = profile?.companies as any

        // If company already has a Late profile, return it
        if (company?.late_profile_id) {
            return NextResponse.json({ profileId: company.late_profile_id })
        }

        // Create a new Late profile for this company
        const result = await (late as any).profiles.createProfile({
            name: company?.name || 'PropFlow Agency',
            description: `PropFlow social media for ${company?.name}`,
        })

        const lateProfile = result?.profile

        // Save the Late profile ID to the company
        if (lateProfile?._id) {
            await supabase
                .from('companies')
                .update({ late_profile_id: lateProfile._id })
                .eq('id', company.id)
        }

        return NextResponse.json({ profileId: lateProfile?._id })
    } catch (error: any) {
        console.error('Social profile error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
