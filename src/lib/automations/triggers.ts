import { dispatchWebhook } from '../webhooks/dispatcher'
import { sendDocumentEmail, sendInvoiceEmail } from './email'

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
    }
) {
    // Run all automations in parallel as non-blocking promises
    Promise.allSettled([
        // Webhook
        dispatchWebhook(companyId, 'document.created', {
            document_id: document.id,
            document_type: document.type,
            document_url: document.url,
            property_address: document.property?.address,
            currency: document.currency || 'USD',
        }),

        // Email
        sendDocumentEmail(companyId, {
            documentId: document.id,
            documentType: document.type,
            documentUrl: document.url,
            propertyAddress: document.property?.address,
            applicantName: document.application?.applicant_name,
            applicantEmail: document.application?.applicant_email,
            landlordEmail: document.landlord?.email,
        }),
    ]).catch(err => console.error('Automation Parallel Execution Error:', err))
}

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
    }
) {
    Promise.allSettled([
        // Webhook
        dispatchWebhook(companyId, 'invoice.created', {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            amount: invoice.total,
            recipient: invoice.recipient_name,
            due_date: invoice.due_date,
            currency: invoice.currency || 'USD',
        }),

        // Email
        sendInvoiceEmail(companyId, {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.total,
            recipientName: invoice.recipient_name,
            recipientEmail: invoice.recipient_email,
            dueDate: invoice.due_date,
            paymentUrl: invoice.payment_url,
        }),
    ]).catch(err => console.error('Automation Parallel Execution Error:', err))
}
