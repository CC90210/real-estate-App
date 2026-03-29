import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api-response'

export async function GET(req: Request, { params }: { params: Promise<{ logId: string }> }) {
    const { logId } = await params;
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return apiError('Unauthorized', { status: 401 })
    }

    // Get user's company for scoping
    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile?.company_id) {
        return apiError('No company found', { status: 403 })
    }

    const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('id', logId)
        .eq('company_id', profile.company_id)
        .maybeSingle()

    if (error || !data) {
        return apiError('Log not found', { status: 404 })
    }

    return NextResponse.json(data)
}
