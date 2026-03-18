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

    const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('id', logId)
        .single()

    if (error || !data) {
        return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    return NextResponse.json(data)
}
