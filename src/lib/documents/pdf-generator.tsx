
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
    try {
        // 1. Fetch invoice data (Admin mode - no company_id filter to avoid mismatches)
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
                ),
                property:properties(
                    address,
                    unit_number
                )
            `)
            .eq('id', invoiceId)
            .single()

        if (invoiceError || !invoice) {
            throw new Error(`Invoice lookup failed: ${invoiceError?.message || 'Not found'}`)
        }

        // 2. Fetch line items
        const { data: tableItems, error: itemsError } = await supabaseAdmin
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoiceId)
            .order('created_at')

        if (itemsError) {
            console.warn("Could not fetch invoice_items table:", itemsError.message);
        }

        // 3. Map items WITHOUT division (DB stores values as displayed in UI or as integers, based on web-ui code)
        let pdfItems = []

        if (tableItems && tableItems.length > 0) {
            pdfItems = tableItems.map(item => ({
                description: item.description || 'Service',
                reference: item.reference || '',
                quantity: item.quantity || 1,
                rate: Number(item.rate || 0),
                amount: Number(item.amount || 0),
            }))
        } else if (invoice.items && Array.isArray(invoice.items)) {
            pdfItems = invoice.items.map((item: any) => ({
                description: item.description || item.name || 'Service',
                reference: item.reference || '',
                quantity: item.quantity || 1,
                rate: Number(item.rate || item.unit_price || 0),
                amount: Number(item.amount || item.total || 0),
            }))
        }

        // 4. Render PDF (Atomic Try-Catch)
        let pdfBuffer: Buffer;
        try {
            pdfBuffer = await renderToBuffer(
                <InvoicePDF
                    companyName={invoice.company?.name || 'Company'}
                    companyAddress={invoice.company?.address}
                    companyPhone={invoice.company?.phone}
                    companyEmail={invoice.company?.email}
                    companyLogo={invoice.company?.logo_url}
                    invoiceNumber={invoice.invoice_number}
                    issueDate={
                        new Date(invoice.issue_date || invoice.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: '2-digit', year: 'numeric'
                        }).toUpperCase()
                    }
                    dueDate={
                        new Date(invoice.due_date).toLocaleDateString('en-US', {
                            month: 'short', day: '2-digit', year: 'numeric'
                        }).toUpperCase()
                    }
                    status={invoice.status}
                    recipientName={invoice.recipient_name}
                    recipientEmail={invoice.recipient_email}
                    lineItems={pdfItems}
                    currency={invoice.currency || 'CAD'}
                    currencySymbol={invoice.currency === 'USD' ? '$' : 'CA$'}
                    notes={invoice.notes}
                    propertyAddress={invoice.property?.address}
                    propertyUnit={invoice.property?.unit_number}
                />
            )
        } catch (renderError: any) {
            throw new Error(`PDF Rendering Engine Failed: ${renderError.message}`)
        }

        // 5. Upload to Storage
        const fileName = `invoices/${companyId}/${invoiceId}_${Date.now()}.pdf`
        const { error: uploadError } = await supabaseAdmin.storage
            .from('documents')
            .upload(fileName, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true,
            })

        if (uploadError) {
            throw new Error(`Storage Vault Permission/Path Failure: ${uploadError.message}`)
        }

        // 6. Get public URL & Update record
        const { data: urlData } = supabaseAdmin.storage
            .from('documents')
            .getPublicUrl(fileName)

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
    } catch (error: any) {
        console.error("Critical Generation Error:", error);
        throw error; // Re-throw with enriched msg
    }
}
