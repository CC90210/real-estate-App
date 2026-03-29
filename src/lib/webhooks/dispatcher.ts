import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateInvoicePDF } from '../documents/pdf-generator'

const supabaseAdmin = getSupabaseAdmin()
const WEBHOOK_FETCH_TIMEOUT_MS = 30000

interface DispatchResult {
    success: boolean
    webhookId?: string
    error?: string
    status?: number
}

interface WebhookPayload {
    event: string
    data: any
    company_id: string
    timestamp: string
    dispatch_notes?: string
    metadata?: Record<string, any>
}

type AutomationSettings = {
    webhook_url?: string | null
    webhook_secret?: string | null
    webhook_events?: string[] | null
}

async function fetchWithTimeout(input: string, init?: RequestInit) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_FETCH_TIMEOUT_MS)

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal,
        })
    } finally {
        clearTimeout(timeoutId)
    }
}

async function loadAutomationSettings(companyId: string) {
    const { data } = await supabaseAdmin
        .from('automation_settings')
        .select('webhook_url, webhook_secret, webhook_events')
        .eq('company_id', companyId)
        .maybeSingle()

    return (data || null) as AutomationSettings | null
}

function resolveWebhookSignatureSecret(settings: AutomationSettings | null) {
    return settings?.webhook_secret || process.env.WEBHOOK_SECRET || process.env.SINGLEKEY_WEBHOOK_SECRET || ''
}

async function createWebhookEventLog(companyId: string, eventType: string, payload: unknown) {
    const { data } = await supabaseAdmin
        .from('webhook_events')
        .insert({
            company_id: companyId,
            event_type: eventType,
            payload,
            status: 'pending',
        })
        .select('id')
        .single()

    return data?.id as string | undefined
}

async function markWebhookEvent(
    eventId: string | undefined,
    patch: Record<string, unknown>
) {
    if (!eventId) {
        return
    }

    await supabaseAdmin
        .from('webhook_events')
        .update({
            ...patch,
            attempts: 1,
            last_attempt_at: new Date().toISOString(),
        })
        .eq('id', eventId)
}

async function deliverWebhook(
    webhookUrl: string,
    eventType: string,
    signature: string,
    payloadTimestamp: string,
    deliveryId: string | undefined,
    transmissionBody: BodyInit,
    contentType?: string
) {
    const headers: Record<string, string> = {
        'X-PropFlow-Signature': signature,
        'X-PropFlow-Event': eventType,
        'X-PropFlow-Timestamp': payloadTimestamp,
        'X-PropFlow-Delivery': deliveryId || '',
    }

    if (contentType) {
        headers['Content-Type'] = contentType
    }

    return fetchWithTimeout(webhookUrl, {
        method: 'POST',
        headers,
        body: transmissionBody,
    })
}

export async function dispatchWebhook(
    companyId: string,
    eventType: string,
    data: any
) {
    try {
        const settings = await loadAutomationSettings(companyId)
        const productionFallbackUrl = process.env.N8N_WEBHOOK_URL || ''
        const webhookUrl = settings?.webhook_url || productionFallbackUrl

        if (!webhookUrl) {
            return
        }

        if (settings?.webhook_events && !settings.webhook_events.includes(eventType)) {
            return
        }

        const payload = {
            event: eventType,
            company_id: companyId,
            timestamp: new Date().toISOString(),
            ...data,
        }

        const signature = crypto
            .createHmac('sha256', resolveWebhookSignatureSecret(settings))
            .update(JSON.stringify(payload))
            .digest('hex')

        const eventLogId = await createWebhookEventLog(companyId, eventType, payload)

        let transmissionBody: BodyInit = JSON.stringify(payload)
        let contentType = 'application/json'

        if (data.file_url && data.file_url !== 'DATA_ONLY_DISPATCH') {
            try {
                const fileResponse = await fetchWithTimeout(data.file_url)
                if (fileResponse.ok) {
                    const fileBuffer = await fileResponse.arrayBuffer()
                    const formData = new FormData()
                    formData.append('payload', JSON.stringify(payload))

                    const fileName = data.invoice_number ? `${data.invoice_number}.pdf` : 'document.pdf'
                    const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' })
                    formData.append('attachment', fileBlob, fileName)

                    transmissionBody = formData
                    contentType = ''
                }
            } catch (attachmentError) {
                console.warn('Failed to attach binary file, falling back to JSON metadata:', attachmentError)
            }
        }

        try {
            const response = await deliverWebhook(
                webhookUrl,
                eventType,
                signature,
                payload.timestamp,
                eventLogId,
                transmissionBody,
                contentType || undefined
            )

            const responseText = await response.text()
            await markWebhookEvent(eventLogId, {
                status: response.ok ? 'sent' : 'failed',
                response_code: response.status,
                error_message: response.ok ? null : responseText.substring(0, 500),
            })

            return { success: response.ok, status: response.status }
        } catch (fetchError: any) {
            await markWebhookEvent(eventLogId, {
                status: 'failed',
                error_message: fetchError?.message || 'Webhook delivery failed',
            })
            throw fetchError
        }
    } catch (error) {
        console.error('Webhook dispatch error:', error)
        throw error
    }
}

export async function dispatchDocumentWebhook(
    companyId: string,
    documentType: 'invoice' | 'document',
    documentId: string,
    dispatchNotes?: string
): Promise<DispatchResult> {
    try {
        const settings = await loadAutomationSettings(companyId)
        const productionFallbackUrl = process.env.N8N_WEBHOOK_URL || ''
        const webhookUrl = settings?.webhook_url || productionFallbackUrl

        if (!webhookUrl) {
            return { success: false, error: 'No webhook URL configured' }
        }

        const eventType = `${documentType}.created`
        if (settings?.webhook_events && !settings.webhook_events.includes(eventType)) {
            return { success: false, error: `Event ${eventType} not enabled` }
        }

        let pdfData: { pdfBuffer: Buffer; pdfUrl: string; fileName: string } = {
            pdfBuffer: Buffer.from(''),
            pdfUrl: '',
            fileName: '',
        }
        let pdfGenerationError: string | undefined
        let documentData: any

        if (documentType === 'invoice') {
            const { data: invoice } = await supabaseAdmin
                .from('invoices')
                .select(`
                    *,
                    company:companies(name),
                    items_table:invoice_items(*)
                `)
                .eq('id', documentId)
                .eq('company_id', companyId)
                .maybeSingle()

            if (!invoice) {
                return { success: false, error: 'Invoice not found in system' }
            }

            try {
                pdfData = await generateInvoicePDF({
                    companyId,
                    invoiceId: documentId,
                })
            } catch (generationError: any) {
                pdfGenerationError = generationError?.message || 'Unknown generation error'
                console.error('PDF GENERATION FAILED:', pdfGenerationError)
            }

            const lineItems = (invoice.items_table && (invoice.items_table as any[]).length > 0)
                ? invoice.items_table
                : (invoice.items || [])

            const totalAmount = (lineItems as any[]).reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0

            documentData = {
                id: invoice.id,
                type: 'invoice',
                invoice_number: invoice.invoice_number,
                amount: totalAmount,
                amount_formatted: `${invoice.currency === 'USD' ? '$' : 'CA$'}${(totalAmount / 100).toLocaleString()}`,
                currency: invoice.currency || 'CAD',
                recipient_name: invoice.recipient_name,
                recipient_email: invoice.recipient_email,
                issue_date: invoice.issue_date,
                due_date: invoice.due_date,
                status: invoice.status,
                property_id: invoice.property_id,
                invoice_notes: invoice.notes,
                items: lineItems,
                pdf_url: pdfData.pdfUrl || undefined,
                pdf_filename: pdfData.fileName || undefined,
                pdf_base64: pdfData.pdfBuffer.length > 0 ? pdfData.pdfBuffer.toString('base64') : undefined,
                pdf_generation_error: pdfGenerationError,
            }
        } else {
            const { data: document } = await supabaseAdmin
                .from('documents')
                .select('*')
                .eq('id', documentId)
                .eq('company_id', companyId)
                .maybeSingle()

            if (!document) {
                return { success: false, error: 'Document not found' }
            }

            documentData = {
                id: document.id,
                type: document.type,
                document_url: document.url,
                property_address: document.property_address || document.property?.address,
            }
        }

        const payload: WebhookPayload = {
            event: eventType,
            timestamp: new Date().toISOString(),
            company_id: companyId,
            dispatch_notes: dispatchNotes,
            data: documentData,
        }

        const signature = crypto
            .createHmac('sha256', resolveWebhookSignatureSecret(settings))
            .update(JSON.stringify(payload))
            .digest('hex')

        const webhookLogId = await createWebhookEventLog(companyId, eventType, payload)

        let transmissionBody: BodyInit = JSON.stringify(payload)
        let contentType = 'application/json'

        if (pdfData.pdfBuffer.length > 0) {
            try {
                const formData = new FormData()
                formData.append('payload', JSON.stringify(payload))

                const fileBlob = new Blob([new Uint8Array(pdfData.pdfBuffer)], { type: 'application/pdf' })
                const finalFileName = pdfData.fileName || `INV-${documentData.invoice_number || 'DOC'}.pdf`
                formData.append('attachment', fileBlob, finalFileName)

                transmissionBody = formData
                contentType = ''
            } catch (formError) {
                console.warn('Multipart construction failed, falling back to JSON:', formError)
            }
        }

        const response = await deliverWebhook(
            webhookUrl,
            eventType,
            signature,
            payload.timestamp,
            webhookLogId,
            transmissionBody,
            contentType || undefined
        )

        await markWebhookEvent(webhookLogId, {
            status: response.ok ? 'sent' : 'failed',
            response_code: response.status,
            error_message: response.ok ? null : await response.text().catch(() => 'Unknown error'),
        })

        return {
            success: response.ok,
            webhookId: webhookLogId,
            error: response.ok ? undefined : `Webhook returned ${response.status}`,
        }
    } catch (error: any) {
        console.error('Webhook dispatch error:', error)
        return {
            success: false,
            error: error?.message || 'Unknown webhook dispatch error',
        }
    }
}
