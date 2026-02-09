
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDF } from './invoice-pdf'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface GenerateInvoicePDFParams {
    companyId: string
    invoiceId: string
}

export async function generateInvoicePDF({ companyId, invoiceId }: GenerateInvoicePDFParams) {
    // Fetch invoice data
    const { data: invoice, error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .select(`
            *,
            company:companies(
                name,
                address,
                phone,
                email,
                logo_url
            )
        `)
        .eq('id', invoiceId)
        .eq('company_id', companyId)
        .single()

    if (invoiceError || !invoice) {
        throw new Error('Invoice not found')
    }

    // Fetch line items
    // Using invoice_items table instead of metadata if the new table is populated
    // Fallback to json items if table is empty (handling transition period)
    const { data: lineItems } = await supabaseAdmin
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at')

    // Map items - prefer table items, fallback to JSON items if table is empty
    let pdfItems = []

    if (lineItems && lineItems.length > 0) {
        pdfItems = lineItems.map(item => ({
            description: item.description,
            reference: item.reference,
            quantity: item.quantity,
            rate: (item.rate || 0) / 100, // Convert from cents
            amount: (item.amount || 0) / 100,
        }))
    } else if (invoice.items && Array.isArray(invoice.items)) {
        // Fallback for legacy invoices stored in JSON column
        pdfItems = invoice.items.map((item: any) => ({
            description: item.description,
            reference: item.name, // Mapping 'name' to reference for legacy
            quantity: item.quantity || 1,
            rate: item.rate || item.unit_price || 0,
            amount: item.amount || 0,
        }))
    }

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
        <InvoicePDF
            companyName={invoice.company?.name || 'Company'}
            companyAddress={invoice.company?.address}
            companyPhone={invoice.company?.phone}
            companyEmail={invoice.company?.email}
            companyLogo={invoice.company?.logo_url}
            invoiceNumber={invoice.invoice_number}
            issueDate={
                new Date(invoice.issue_date || invoice.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric'
                }).toUpperCase()
            }
            dueDate={
                new Date(invoice.due_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric'
                }).toUpperCase()
            }
            status={invoice.status}
            recipientName={invoice.recipient_name}
            recipientEmail={invoice.recipient_email}
            lineItems={pdfItems}
            currency={invoice.currency || 'CAD'}
            currencySymbol={invoice.currency === 'USD' ? '$' : 'CA$'}
        />
    )

    // Upload to Supabase Storage
    const fileName = `invoices/${companyId}/${invoiceId}.pdf`

    // We strictly use the service key here to bypass any potential RLS friction during automation
    const { error: uploadError } = await supabaseAdmin.storage
        .from('documents')
        .upload(fileName, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true,
        })

    if (uploadError) {
        throw new Error(`Failed to upload PDF: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
        .from('documents')
        .getPublicUrl(fileName)

    // Update invoice with PDF URL
    await supabaseAdmin
        .from('invoices')
        .update({
            pdf_url: urlData.publicUrl,
            pdf_generated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

    return {
        pdfBuffer,
        pdfUrl: urlData.publicUrl,
        fileName: `INV-${invoice.invoice_number}.pdf`,
    }
}
