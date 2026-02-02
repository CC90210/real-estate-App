import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(req: Request) {
    const signature = req.headers.get('X-PropFlow-Signature')
    const logId = req.headers.get('X-PropFlow-Log-Id')
    const body = await req.text()

    // Verify signature
    const secret = process.env.N8N_WEBHOOK_SECRET
    if (secret) {
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex')

        if (signature !== expectedSignature) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
    }

    const data = JSON.parse(body)
    const supabase = await createClient()

    // Update the automation log
    await supabase
        .from('automation_logs')
        .update({
            status: data.success ? 'completed' : 'failed',
            result: data.result,
            error_message: data.error,
            completed_at: new Date().toISOString()
        })
        .eq('id', logId)

    // Optionally create a notification for the user
    // (Assuming notifications table exists, if not, skip)
    /*
    if (data.success) {
        const { data: log } = await supabase
            .from('automation_logs')
            .select('user_id, company_id, action_type')
            .eq('id', logId)
            .single()
        
        if (log) {
            await supabase.from('notifications').insert({
                user_id: log.user_id,
                company_id: log.company_id,
                title: 'Automation Complete',
                message: `Your ${log.action_type} has been completed successfully.`,
                type: 'success'
            })
        }
    }
    */

    return NextResponse.json({ received: true })
}
