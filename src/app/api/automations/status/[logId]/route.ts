import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: Promise<{ logId: string }> }) {
    // Next.js 15+ params are async
    const { logId } = await params;
    const supabase = await createClient()

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
