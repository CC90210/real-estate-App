import { createHash } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function registerIncomingWebhookEvent(
    provider: string,
    eventId: string,
    payload: string,
    ttlSeconds = 60 * 60 * 24
) {
    const supabaseAdmin = getSupabaseAdmin()
    const payloadHash = createHash('sha256').update(payload).digest('hex')

    const { data, error } = await supabaseAdmin.rpc('register_incoming_webhook_event', {
        p_provider: provider,
        p_event_id: eventId,
        p_payload_hash: payloadHash,
        p_ttl_seconds: ttlSeconds,
    })

    if (error) {
        throw error
    }

    return Array.isArray(data) ? Boolean(data[0]) : Boolean(data)
}

export function sha256Hex(value: string) {
    return createHash('sha256').update(value).digest('hex')
}
