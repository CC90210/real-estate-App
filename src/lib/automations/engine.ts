import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendDocumentDeliveryEmail, sendInvoiceEmail } from '@/lib/email'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Get a Supabase client with service role (bypasses RLS for automation operations).
 * Only used server-side in API routes.
 */
function getServiceClient() {
    return createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

export type AutomationEvent =
    | 'DOCUMENT_SEND'
    | 'LEASE_GENERATED'
    | 'APPLICATION_SUBMITTED'
    | 'INVOICE_CREATED'

export interface AutomationPayload {
    company_id: string
    document_id?: string
    document_type?: string
    document_url?: string
    property_address?: string
    recipient_name?: string
    recipient_email?: string
    agent_name?: string
    message?: string
    // Invoice-specific
    invoice_number?: string
    amount?: number
    due_date?: string
    payment_url?: string
    currency?: string
    [key: string]: unknown
}

export interface AutomationResult {
    success: boolean
    automation_type: string
    message: string
    details?: Record<string, unknown>
}

/**
 * Execute an automation event inline (no external service needed).
 * Company-scoped — all queries filter by company_id.
 */
export async function executeAutomation(
    event: AutomationEvent,
    payload: AutomationPayload
): Promise<AutomationResult> {
    const { company_id } = payload

    if (!company_id) {
        return { success: false, automation_type: 'unknown', message: 'Missing company_id' }
    }

    // Check if this automation type is active for the company
    const isEnabled = await checkAutomationEnabled(company_id, event)
    if (!isEnabled) {
        return {
            success: true,
            automation_type: event,
            message: 'Automation not enabled for this company — skipped',
        }
    }

    try {
        switch (event) {
            case 'DOCUMENT_SEND':
            case 'LEASE_GENERATED':
                return await handleDocumentSend(event, payload)
            case 'INVOICE_CREATED':
                return await handleInvoiceSend(payload)
            default:
                return {
                    success: true,
                    automation_type: event,
                    message: `No handler for event: ${event}`,
                }
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[AUTOMATION ENGINE] ${event} failed:`, message)
        await logExecution(company_id, event, 'failed', message)
        return {
            success: false,
            automation_type: event,
            message,
        }
    }
}

/**
 * Check if a company has this automation type enabled.
 * Pro+ plans get document/lease automations by default.
 */
async function checkAutomationEnabled(companyId: string, event: AutomationEvent): Promise<boolean> {
    const db = getServiceClient()

    // Map events to automation config types
    const eventToType: Record<string, string> = {
        DOCUMENT_SEND: 'document_sender',
        LEASE_GENERATED: 'document_sender',
        INVOICE_CREATED: 'invoice_sender',
        APPLICATION_SUBMITTED: 'application_processor',
    }

    const automationType = eventToType[event]
    if (!automationType) return false

    // Check for explicit automation_configs record
    const { data: config } = await db
        .from('automation_configs')
        .select('status')
        .eq('company_id', companyId)
        .eq('type', automationType)
        .maybeSingle()

    if (config?.status === 'active') return true

    // Plan-based gating: Pro+ plans get document_sender automatically
    const { data: company } = await db
        .from('companies')
        .select('subscription_plan, plan_override')
        .eq('id', companyId)
        .single()

    if (!company) return false

    const effectivePlan = (company.plan_override || company.subscription_plan) as string
    const plansWithDocAutomation = ['agent_pro', 'agency_growth', 'brokerage_command', 'enterprise']

    if (plansWithDocAutomation.includes(effectivePlan)) {
        if (['document_sender', 'invoice_sender'].includes(automationType)) {
            return true
        }
    }

    return false
}

/**
 * Handle DOCUMENT_SEND and LEASE_GENERATED events.
 * Sends the document to the recipient via email.
 */
async function handleDocumentSend(
    event: string,
    payload: AutomationPayload
): Promise<AutomationResult> {
    const {
        company_id,
        document_id,
        document_type,
        recipient_email,
        recipient_name,
        property_address,
        agent_name,
        message,
    } = payload

    if (!recipient_email) {
        return {
            success: false,
            automation_type: 'document_sender',
            message: 'No recipient_email in payload — cannot send document',
        }
    }

    const db = getServiceClient()

    // Fetch document metadata (company-scoped)
    let documentTitle = 'Rental Document'
    if (document_id) {
        const { data: doc } = await db
            .from('documents')
            .select('title, type')
            .eq('id', document_id)
            .eq('company_id', company_id)
            .single()

        if (doc?.title) {
            documentTitle = doc.title as string
        }
    }

    // Fetch company name for email branding
    const { data: company } = await db
        .from('companies')
        .select('name')
        .eq('id', company_id)
        .single()

    const companyName = (company?.name as string) || 'PropFlow'

    // Build view URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://propflow.pro'
    const viewUrl = document_id ? `${appUrl}/documents/${document_id}` : appUrl

    // Send the email
    const result = await sendDocumentDeliveryEmail({
        email: recipient_email,
        recipientName: recipient_name || 'Valued Client',
        documentTitle,
        documentType: document_type || 'document',
        propertyAddress: property_address,
        agentName: agent_name,
        companyName,
        viewUrl,
        message,
    })

    // Log execution
    await logExecution(
        company_id,
        event,
        result.success ? 'success' : 'failed',
        result.success ? `Sent to ${recipient_email}` : (result as { error?: string }).error
    )

    // Update document delivery status
    if (document_id && result.success) {
        await db
            .from('documents')
            .update({
                delivery_status: 'sent',
                delivered_to: recipient_email,
                delivered_at: new Date().toISOString(),
            })
            .eq('id', document_id)
            .eq('company_id', company_id)
    }

    return {
        success: result.success,
        automation_type: 'document_sender',
        message: result.success
            ? `Document "${documentTitle}" sent to ${recipient_email}`
            : `Failed to send document: ${(result as { error?: string }).error}`,
        details: {
            document_id,
            recipient_email,
            email_id: (result as { id?: string }).id,
        },
    }
}

/**
 * Handle INVOICE_CREATED events.
 */
async function handleInvoiceSend(payload: AutomationPayload): Promise<AutomationResult> {
    const {
        company_id,
        document_id,
        recipient_email,
        recipient_name,
        invoice_number,
        amount,
        due_date,
    } = payload

    if (!recipient_email || !invoice_number) {
        return {
            success: false,
            automation_type: 'invoice_sender',
            message: 'Missing recipient_email or invoice_number',
        }
    }

    const db = getServiceClient()

    const { data: company } = await db
        .from('companies')
        .select('name')
        .eq('id', company_id)
        .single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://propflow.pro'

    const result = await sendInvoiceEmail({
        email: recipient_email,
        recipientName: recipient_name || 'Tenant',
        invoiceNumber: invoice_number,
        amount: amount || 0,
        dueDate: due_date || 'Upon Receipt',
        companyName: (company?.name as string) || 'PropFlow',
        downloadUrl: document_id ? `${appUrl}/invoices/${document_id}` : undefined,
    })

    await logExecution(
        company_id,
        'INVOICE_CREATED',
        result.success ? 'success' : 'failed',
        result.success
            ? `Invoice ${invoice_number} sent to ${recipient_email}`
            : (result as { error?: string }).error
    )

    return {
        success: result.success,
        automation_type: 'invoice_sender',
        message: result.success
            ? `Invoice ${invoice_number} sent to ${recipient_email}`
            : `Failed to send invoice: ${(result as { error?: string }).error}`,
    }
}

/**
 * Log automation execution to automation_executions table.
 * Best-effort — never throws.
 */
async function logExecution(
    companyId: string,
    event: string,
    status: 'success' | 'failed',
    detail?: string
) {
    try {
        const db = getServiceClient()

        const eventToType: Record<string, string> = {
            DOCUMENT_SEND: 'document_sender',
            LEASE_GENERATED: 'document_sender',
            INVOICE_CREATED: 'invoice_sender',
        }
        const automationType = eventToType[event] || event

        const { data: config } = await db
            .from('automation_configs')
            .select('id')
            .eq('company_id', companyId)
            .eq('type', automationType)
            .maybeSingle()

        if (config) {
            await db.from('automation_executions').insert({
                automation_id: config.id,
                status,
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                error_message: status === 'failed' ? detail : null,
            })

            // Try RPC increment; fall back to a simple timestamp update if it doesn't exist
            try {
                await db.rpc('increment_automation_counter', {
                    config_id: config.id,
                    is_success: status === 'success',
                })
            } catch {
                await db
                    .from('automation_configs')
                    .update({ last_execution_at: new Date().toISOString() })
                    .eq('id', config.id)
            }
        }
    } catch (err) {
        // Best-effort logging — never crash the automation
        console.error('[AUTOMATION LOG] Failed to log execution:', err)
    }
}
