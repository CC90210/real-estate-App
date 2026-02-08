import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface WebhookPayload {
    event: string
    data: any
    company_id: string
    timestamp: string
}

export async function dispatchWebhook(
    companyId: string,
    eventType: string,
    data: any
) {
    try {
        // Get company's automation settings
        const { data: settings } = await supabaseAdmin
            .from('automation_settings')
            .select('webhook_url, webhook_secret, webhook_events')
            .eq('company_id', companyId)
            .single()

        // Check if webhook is configured and event is enabled
        if (!settings?.webhook_url) {
            console.log(`No webhook URL for company ${companyId}`)
            return
        }

        if (!settings.webhook_events?.includes(eventType)) {
            console.log(`Event ${eventType} not enabled for company ${companyId}`)
            return
        }

        const payload: WebhookPayload = {
            event: eventType,
            data,
            company_id: companyId,
            timestamp: new Date().toISOString(),
        }

        // Create signature for verification
        const signature = crypto
            .createHmac('sha256', settings.webhook_secret || 'default_secret')
            .update(JSON.stringify(payload))
            .digest('hex')

        // Log the event
        const { data: eventLog, error: logError } = await supabaseAdmin
            .from('webhook_events')
            .insert({
                company_id: companyId,
                event_type: eventType,
                payload,
                status: 'pending',
            })
            .select()
            .single()

        if (logError) {
            console.error('Failed to log webhook event:', logError)
        }

        // Send webhook
        try {
            const response = await fetch(settings.webhook_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-PropFlow-Signature': signature,
                    'X-PropFlow-Event': eventType,
                    'X-PropFlow-Timestamp': payload.timestamp,
                },
                body: JSON.stringify(payload),
            })

            // Update event log
            await supabaseAdmin
                .from('webhook_events')
                .update({
                    status: response.ok ? 'sent' : 'failed',
                    attempts: 1,
                    last_attempt_at: new Date().toISOString(),
                    response_code: response.status,
                    error_message: response.ok ? null : await response.text(),
                })
                .eq('id', eventLog?.id)

            return { success: response.ok, status: response.status }

        } catch (fetchError: any) {
            // Update event log with error
            await supabaseAdmin
                .from('webhook_events')
                .update({
                    status: 'failed',
                    attempts: 1,
                    last_attempt_at: new Date().toISOString(),
                    error_message: fetchError.message,
                })
                .eq('id', eventLog?.id)

            throw fetchError
        }

    } catch (error) {
        console.error('Webhook dispatch error:', error)
        throw error
    }
}
