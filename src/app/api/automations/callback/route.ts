import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { z } from 'zod'

// Admin client for webhook callbacks (no user session available)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const callbackSchema = z.object({
    success: z.boolean(),
    result: z.unknown().optional(),
    error: z.string().max(2000).optional(),
    company_id: z.string().uuid(),
})

export async function POST(req: Request) {
    const signature = req.headers.get('X-PropFlow-Signature')
    const logId = req.headers.get('X-PropFlow-Log-Id')
    const body = await req.text()

    // Verify signature — REQUIRED in production
    const secret = process.env.N8N_WEBHOOK_SECRET
    if (!secret) {
        console.error('N8N_WEBHOOK_SECRET not configured — callback endpoint disabled')
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
    }

    if (!logId || !signature) {
        return NextResponse.json({ error: 'Missing required headers' }, { status: 400 })
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex')

    const sigBuf = Buffer.from(signature)
    const expectedBuf = Buffer.from(expectedSignature)
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let parsed
    try {
        const raw = JSON.parse(body)
        const validation = callbackSchema.safeParse(raw)
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
        }
        parsed = validation.data
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Update the automation log — scoped by BOTH id AND company_id
    const { error: updateError } = await supabaseAdmin
        .from('automation_logs')
        .update({
            status: parsed.success ? 'completed' : 'failed',
            result: parsed.result,
            error_message: parsed.error,
            completed_at: new Date().toISOString()
        })
        .eq('id', logId)
        .eq('company_id', parsed.company_id)

    if (updateError) {
        console.error('[Callback] Update failed:', updateError)
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ received: true })
}
