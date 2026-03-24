import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface DocumentEmailData {
    documentId: string
    documentType: string
    documentUrl: string
    propertyAddress?: string
    applicantName?: string
    applicantEmail?: string
    landlordEmail?: string
}

interface InvoiceEmailData {
    invoiceId: string
    invoiceNumber: string
    amount: number
    recipientName: string
    recipientEmail: string
    dueDate?: string
    paymentUrl?: string
}

/**
 * Send an email via the connected Gmail OAuth account for the company.
 * Falls back to logging if no Gmail account is connected.
 */
async function sendViaGmail(
    companyId: string,
    to: string | string[],
    subject: string,
    body: string,
    html?: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        // Check if company has a connected Gmail account
        const { data: token } = await supabaseAdmin
            .from('gmail_oauth_tokens')
            .select('id')
            .eq('company_id', companyId)
            .eq('is_primary', true)
            .maybeSingle()

        if (!token) {
            console.log(`[EMAIL] No Gmail connected for company ${companyId} — skipping email send`)
            return { success: false, error: 'No Gmail account connected' }
        }

        // Call the internal Gmail send API
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const response = await fetch(`${appUrl}/api/gmail/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, body, html }),
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Unknown error' }))
            return { success: false, error: err.error }
        }

        return { success: true }
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        console.error('[EMAIL] Gmail send failed:', msg)
        return { success: false, error: msg }
    }
}

export async function sendDocumentEmail(companyId: string, data: DocumentEmailData) {
    try {
        // Get automation settings
        const { data: settings } = await supabaseAdmin
            .from('automation_settings')
            .select('document_email_enabled, document_email_recipients, document_email_template')
            .eq('company_id', companyId)
            .single()

        if (!settings?.document_email_enabled) {
            console.log('Document email automation disabled for company:', companyId)
            return
        }

        // Get company info for branding
        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('name, email')
            .eq('id', companyId)
            .single()

        // Determine recipients
        const recipients: string[] = []
        for (const recipient of settings.document_email_recipients || []) {
            if (recipient === 'applicant' && data.applicantEmail) {
                recipients.push(data.applicantEmail)
            } else if (recipient === 'landlord' && data.landlordEmail) {
                recipients.push(data.landlordEmail)
            } else if (recipient.includes('@')) {
                recipients.push(recipient)
            }
        }

        if (recipients.length === 0) {
            console.log('No recipients for document email')
            return
        }

        const companyName = company?.name || 'PropFlow'
        const docLabel = data.documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        const subject = `${docLabel} Ready — ${data.propertyAddress || 'Your Property'}`
        const textBody = `Hi ${data.applicantName || 'there'},\n\nA new ${docLabel} has been prepared for ${data.propertyAddress || 'your property'}.\n\nYou can view it here: ${data.documentUrl}\n\nBest regards,\n${companyName}`

        const htmlBody = `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:40px 20px">
                <div style="background:#fff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
                    <h1 style="font-size:24px;color:#1e293b;margin:0 0 8px">${companyName}</h1>
                    <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#3b82f6;margin:0 0 32px">Property Intelligence</p>
                    <h2 style="font-size:20px;color:#0f172a">Document Ready</h2>
                    <p style="color:#475569;line-height:1.7">Hi ${data.applicantName || 'there'},</p>
                    <p style="color:#475569;line-height:1.7">A new <strong>${docLabel}</strong> has been prepared for <strong>${data.propertyAddress || 'your property'}</strong>.</p>
                    <div style="text-align:center;margin:24px 0">
                        <a href="${data.documentUrl}" style="display:inline-block;padding:14px 32px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:12px;font-weight:700">View Document</a>
                    </div>
                    <p style="color:#94a3b8;font-size:13px">If you did not expect this document, please contact your agent directly.</p>
                </div>
            </div>`

        const result = await sendViaGmail(companyId, recipients, subject, textBody, htmlBody)
        console.log(`[EMAIL] Document email to ${recipients.join(', ')}:`, result.success ? 'sent' : result.error)

        return result
    } catch (error) {
        console.error('Send document email error:', error)
        throw error
    }
}

export async function sendInvoiceEmail(companyId: string, data: InvoiceEmailData) {
    try {
        // Get automation settings
        const { data: settings } = await supabaseAdmin
            .from('automation_settings')
            .select('invoice_email_enabled, invoice_email_template')
            .eq('company_id', companyId)
            .single()

        if (!settings?.invoice_email_enabled) {
            console.log('Invoice email automation disabled for company:', companyId)
            return
        }

        // Get company info
        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('name, email')
            .eq('id', companyId)
            .single()

        const companyName = company?.name || 'PropFlow'
        const subject = `Invoice #${data.invoiceNumber} — $${data.amount.toLocaleString()}`
        const textBody = `Hi ${data.recipientName},\n\nInvoice #${data.invoiceNumber} for $${data.amount.toLocaleString()} is ready.\n\n${data.paymentUrl ? `Pay here: ${data.paymentUrl}` : 'Please contact us for payment details.'}\n\n${data.dueDate ? `Due by: ${data.dueDate}` : ''}\n\nBest regards,\n${companyName}`

        const result = await sendViaGmail(companyId, data.recipientEmail, subject, textBody)
        console.log(`[EMAIL] Invoice email to ${data.recipientEmail}:`, result.success ? 'sent' : result.error)

        return result
    } catch (error) {
        console.error('Send invoice email error:', error)
        throw error
    }
}
