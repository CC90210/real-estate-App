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

        // SIMULATION: In production, use Resend or SendGrid
        console.log(`[EMAIL AUTOMATION] Sending Document Email to ${recipients.join(', ')} for company ${company?.name}`)

        return { success: true, recipients }

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

        // SIMULATION
        console.log(`[EMAIL AUTOMATION] Sending Invoice Email to ${data.recipientEmail} for company ${company?.name}`)

        return { success: true }

    } catch (error) {
        console.error('Send invoice email error:', error)
        throw error
    }
}
