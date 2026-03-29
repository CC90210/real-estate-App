import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiError, zodIssuesToDetails } from '@/lib/api-response'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { registerIncomingWebhookEvent } from '@/lib/webhook-idempotency'

// Admin client for webhook callbacks (no user session available)
const supabaseAdmin = getSupabaseAdmin()

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

    // Verify signature - REQUIRED in production
    const secret = process.env.N8N_WEBHOOK_SECRET
    if (!secret) {
        console.error('N8N_WEBHOOK_SECRET not configured - callback endpoint disabled')
        return apiError('Webhook not configured', { status: 503, code: 'WEBHOOK_NOT_CONFIGURED' })
    }

    if (!logId || !signature) {
        return apiError('Missing required headers', { status: 400, code: 'MISSING_HEADERS' })
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex')

    const sigBuf = Buffer.from(signature)
    const expectedBuf = Buffer.from(expectedSignature)
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return apiError('Invalid signature', { status: 401, code: 'INVALID_SIGNATURE' })
    }

    let parsed: z.infer<typeof callbackSchema>
    try {
        const raw = JSON.parse(body)
        const validation = callbackSchema.safeParse(raw)
        if (!validation.success) {
            return apiError('Invalid payload', {
                status: 400,
                code: 'VALIDATION_ERROR',
                details: zodIssuesToDetails(validation.error.issues),
            })
        }
        parsed = validation.data
    } catch {
        return apiError('Invalid JSON body', { status: 400, code: 'INVALID_JSON' })
    }

    try {
        const isNewEvent = await registerIncomingWebhookEvent(
            'automation-callback',
            logId,
            body,
            60 * 60 * 24 * 7
        )

        if (!isNewEvent) {
            return NextResponse.json({ received: true, duplicate: true })
        }
    } catch (dedupeError) {
        console.warn('[Callback] Durable dedupe unavailable; continuing', dedupeError)
    }

    // Update the automation log - scoped by BOTH id AND company_id
    const { error: updateError } = await supabaseAdmin
        .from('automation_logs')
        .update({
            status: parsed.success ? 'completed' : 'failed',
            result: parsed.result,
            error_message: parsed.error,
            completed_at: new Date().toISOString(),
        })
        .eq('id', logId)
        .eq('company_id', parsed.company_id)

    if (updateError) {
        console.error('[Callback] Update failed:', updateError)
        return apiError('Update failed', { status: 500 })
    }

    return NextResponse.json({ received: true })
}
