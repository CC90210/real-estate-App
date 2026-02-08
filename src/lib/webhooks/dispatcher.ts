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
        // 1. Get company's automation settings
        const { data: settings } = await supabaseAdmin
            .from('automation_settings')
            .select('webhook_url, webhook_secret, webhook_events')
            .eq('company_id', companyId)
            .single()

        const PRODUCTION_FALLBACK_URL = 'https://n8n.srv993801.hstgr.cloud/webhook/ad6dd389-7003-4276-9f6c-5eec3836020d';
        let webhookUrl = settings?.webhook_url || PRODUCTION_FALLBACK_URL;

        if (!webhookUrl) return;

        if (settings && settings.webhook_events && !settings.webhook_events.includes(eventType)) {
            return;
        }

        // 2. Surgical Payload Refinement (Flat & Clean)
        // We remove the nesting of 'data' to provide a cleaner schema for n8n
        const payload = {
            event: eventType,
            company_id: companyId,
            timestamp: new Date().toISOString(),
            ...data // Spread the actual payload (invoice_id, amount, etc.)
        };

        // 3. HMAC Signature (Based on clean payload)
        const signature = crypto
            .createHmac('sha256', settings?.webhook_secret || 'default_secret')
            .update(JSON.stringify(payload))
            .digest('hex')

        // 4. Log the Intent
        const { data: eventLog } = await supabaseAdmin
            .from('webhook_events')
            .insert({
                company_id: companyId,
                event_type: eventType,
                payload,
                status: 'pending',
            })
            .select()
            .single()

        // 5. Binary Attachment Logic (Atomic Relay)
        let transmissionBody: any = JSON.stringify(payload);
        let contentType = 'application/json';

        if (data.file_url && data.file_url !== "DATA_ONLY_DISPATCH") {
            try {
                // Fetch the actual document from Supabase storage using the signed URL
                const fileResponse = await fetch(data.file_url);
                if (fileResponse.ok) {
                    const fileBuffer = await fileResponse.arrayBuffer();

                    // We switch to Multipart/Form-Data to "attach" the actual file
                    const formData = new FormData();
                    formData.append('payload', JSON.stringify(payload));

                    // Construct a file blob for the attachment field
                    const fileName = data.invoice_number ? `${data.invoice_number}.pdf` : 'document.pdf';
                    const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });
                    formData.append('attachment', fileBlob, fileName);

                    transmissionBody = formData;
                    contentType = ''; // Browser/Node fetch will automatically set the boundary
                }
            } catch (attError) {
                console.warn("Failed to attach binary file, falling back to JSON metadata:", attError);
            }
        }

        // 6. Signed Propagation
        try {
            const headers: Record<string, string> = {
                'X-PropFlow-Signature': signature,
                'X-PropFlow-Event': eventType,
                'X-PropFlow-Timestamp': payload.timestamp,
            };

            // Only set Content-Type if it's not multipart (fetch handles boundary)
            if (contentType) {
                headers['Content-Type'] = contentType;
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers,
                body: transmissionBody,
            })

            const responseText = await response.text();

            // Update Ledger
            await supabaseAdmin
                .from('webhook_events')
                .update({
                    status: response.ok ? 'sent' : 'failed',
                    attempts: 1,
                    last_attempt_at: new Date().toISOString(),
                    response_code: response.status,
                    error_message: response.ok ? null : responseText.substring(0, 500),
                })
                .eq('id', eventLog?.id)

            return { success: response.ok, status: response.status }

        } catch (fetchError: any) {
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
