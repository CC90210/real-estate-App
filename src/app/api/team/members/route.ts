import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api-response'

// GET - List team members for company
export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return apiError('Unauthorized', { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return apiError('No company found', { status: 400 })
        }

        const { data: members, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, avatar_url, created_at')
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: true })
            .limit(200)

        if (error) {
            throw error
        }

        return NextResponse.json({ members: members || [] })

    } catch (error) {
        return apiError('Failed to fetch members', { status: 500 })
    }
}
