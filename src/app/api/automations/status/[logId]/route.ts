import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: Promise<{ logId: string }> }) {
    const { logId } = await params;
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company for scoping
    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

    if (!profile?.company_id) {
        return NextResponse.json({ error: 'No company found' }, { status: 403 })
    }

    const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('id', logId)
        .eq('company_id', profile.company_id)
        .single()

    if (error || !data) {
        return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    return NextResponse.json(data)
}
