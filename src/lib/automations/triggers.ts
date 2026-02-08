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
    try {
        // Webhook
        fetch('/api/webhooks/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'document',
                data: {
                    document_id: document.id,
                    document_type: document.type,
                    file_url: document.url,
                    property_address: document.property?.address,
                    recipient_name: document.application?.applicant_name || 'Prospect',
                    recipient_email: document.application?.applicant_email,
                    currency: document.currency || 'USD',
                    triggered_at: new Date().toISOString()
                }
            }),
        }).catch(err => console.error('Webhook Trigger Failed:', err));

        // Email
        sendDocumentEmail(companyId, {
            documentId: document.id,
            documentType: document.type,
            documentUrl: document.url,
            propertyAddress: document.property?.address,
            applicantName: document.application?.applicant_name,
            applicantEmail: document.application?.applicant_email,
            landlordEmail: document.landlord?.email,
        }).catch(err => console.error('Email Trigger Failed:', err));

    } catch (err) {
        console.error('Document Automation Parallel Execution Error:', err);
    }
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
        items?: any[]
    }
) {
    try {
        // Webhook
        fetch('/api/webhooks/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'invoice',
                data: {
                    invoice_id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    recipient_name: invoice.recipient_name,
                    recipient_email: invoice.recipient_email,
                    amount: invoice.total,
                    company_id: companyId,
                    items: invoice.items || [],
                    due_date: invoice.due_date,
                    currency: invoice.currency || 'USD',
                    file_url: "DATA_ONLY_ON_CREATE",
                    dispatch_notes: "Auto-trigger on creation",
                    triggered_at: new Date().toISOString()
                }
            }),
        }).catch(err => console.error('Webhook Trigger Failed:', err));

        // Email
        sendInvoiceEmail(companyId, {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.total,
            recipientName: invoice.recipient_name,
            recipientEmail: invoice.recipient_email,
            dueDate: invoice.due_date,
            paymentUrl: invoice.payment_url,
        }).catch(err => console.error('Email Trigger Failed:', err));

    } catch (err) {
        console.error('Invoice Automation Parallel Execution Error:', err);
    }
}
