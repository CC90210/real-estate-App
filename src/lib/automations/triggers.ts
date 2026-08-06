import { triggerAutomation } from './dispatcher'

/**
 * Both triggers are imported from client pages (invoices/new, invoices/[id]/edit)
 * AND from a server route (api/generate-document). The browser path goes through
 * the authenticated API route; the server path must execute in-process, since a
 * relative fetch has no origin there.
 *
 * Rather than fork this file, the dispatcher is injected. Server callers pass
 * triggerAutomationServer from ./dispatcher-server — which is server-only, so it
 * never reaches a client bundle. The default keeps every existing client call
 * site unchanged.
 */
export type AutomationDispatch = typeof triggerAutomation

/**
 * Trigger document-related automations when a document is generated.
 * Routes through the central dispatcher to the Python automation service.
 */
export async function triggerDocumentAutomations(
    companyId: string,
    document: {
        id: string
        type: string
        url: string
        property?: { address: string }
        application?: {
            applicant_name: string
            applicant_email: string
        }
        landlord?: { email: string }
        currency?: string
    },
    dispatch: AutomationDispatch = triggerAutomation
) {
    try {
        const eventType = document.type === 'lease_proposal' ? 'LEASE_GENERATED' : 'DOCUMENT_SEND'

        await dispatch(eventType, {
            company_id: companyId,
            document_id: document.id,
            document_type: document.type,
            document_url: document.url,
            property_address: document.property?.address,
            recipient_name: document.application?.applicant_name || 'Prospect',
            recipient_email: document.application?.applicant_email,
            landlord_email: document.landlord?.email,
            currency: document.currency || 'USD',
        })
    } catch (err) {
        console.error('Document automation trigger failed:', err)
    }
}

/**
 * Trigger invoice-related automations when an invoice is created.
 */
export async function triggerInvoiceAutomations(
    companyId: string,
    invoice: {
        id: string
        invoice_number: string
        total: number
        recipient_name: string
        recipient_email: string
        due_date?: string
        payment_url?: string
        currency?: string
        items?: any[]
    },
    dispatch: AutomationDispatch = triggerAutomation
) {
    try {
        await dispatch('DOCUMENT_SEND', {
            company_id: companyId,
            document_id: invoice.id,
            document_type: 'invoice',
            recipient_name: invoice.recipient_name,
            recipient_email: invoice.recipient_email,
            amount: invoice.total,
            invoice_number: invoice.invoice_number,
            due_date: invoice.due_date,
            payment_url: invoice.payment_url,
            currency: invoice.currency || 'USD',
        })
    } catch (err) {
        console.error('Invoice automation trigger failed:', err)
    }
}
