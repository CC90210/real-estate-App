'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Printer, DollarSign, CheckCircle, Clock, XCircle, Send } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useState } from 'react'

// ============================================================================
// PRODUCTION INVOICE VIEWER - Fully Branded & Printable
// ============================================================================

export default function InvoiceViewPage() {
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()
    const id = params?.id as string
    const [isUpdating, setIsUpdating] = useState(false)

    const { data: invoice, isLoading, error, refetch } = useQuery({
        queryKey: ['invoice', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('invoices')
                .select('*, property:properties(address, unit_number), company:companies(name, logo_url, address, phone, email)')
                .eq('id', id)
                .single()

            if (error) throw error
            return data
        }
    })

    const handlePrint = () => window.print()

    const updateStatus = async (newStatus: string) => {
        setIsUpdating(true)
        try {
            const { error } = await supabase
                .from('invoices')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error
            toast.success(`Invoice marked as ${newStatus}`)
            refetch()
        } catch (e: any) {
            toast.error('Failed to update invoice', { description: e.message })
        } finally {
            setIsUpdating(false)
        }
    }

    if (isLoading) {
        return (
            <div className="p-8 max-w-4xl mx-auto space-y-8">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-[800px] w-full rounded-none" />
            </div>
        )
    }

    if (error || !invoice) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Invoice Not Found</h2>
                <p className="text-slate-500 mb-6">The invoice you are looking for does not exist or you do not have permission.</p>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        )
    }

    const company = invoice.company as any;
    const property = invoice.property as any;
    const items = invoice.items || [];

    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
        draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600', icon: Clock },
        sent: { label: 'Awaiting Payment', color: 'bg-blue-100 text-blue-700', icon: Send },
        paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
        overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: XCircle },
        cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-400', icon: XCircle },
    }
    const currentStatus = statusConfig[invoice.status] || statusConfig.draft;
    const StatusIcon = currentStatus.icon;

    // Helper to safely format dates
    const safeFormat = (dateStr: string | null, fmt: string) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : format(d, fmt);
    }

    return (
        <div className="min-h-screen bg-slate-100/50 pb-20 print:pb-0 print:bg-white">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 print:hidden mb-8 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push('/invoices')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Invoices
                    </Button>
                    <div className="h-6 w-px bg-slate-200" />
                    <h1 className="font-semibold text-slate-700">Invoice #{invoice.invoice_number}</h1>
                    <Badge className={`${currentStatus.color} rounded-lg font-bold uppercase text-xs`}>
                        <StatusIcon className="w-3 h-3 mr-1.5" />
                        {currentStatus.label}
                    </Badge>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push(`/invoices/${id}/edit`)} className="rounded-xl font-bold">
                        Edit Invoice
                    </Button>
                    {invoice.status === 'draft' && (
                        <Button variant="outline" onClick={() => updateStatus('sent')} disabled={isUpdating} className="rounded-xl font-bold">
                            <Send className="w-4 h-4 mr-2" /> Mark as Sent
                        </Button>
                    )}
                    {invoice.status === 'sent' && (
                        <Button variant="outline" onClick={() => updateStatus('paid')} disabled={isUpdating} className="rounded-xl font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                            <CheckCircle className="w-4 h-4 mr-2" /> Mark as Paid
                        </Button>
                    )}
                    <Button onClick={handlePrint} className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold">
                        <Printer className="w-4 h-4 mr-2" />
                        Print / Save PDF
                    </Button>
                </div>
            </div>

            {/* Invoice Paper */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:max-w-none min-h-[297mm] p-[20mm] text-slate-900 leading-relaxed text-sm">

                {/* Header */}
                <div className="flex justify-between items-start mb-12 border-b border-slate-100 pb-8">
                    <div>
                        {company?.logo_url && (
                            <img src={company.logo_url} alt="Logo" className="h-14 mb-4" />
                        )}
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">{company?.name || 'Your Company'}</h1>
                        <p className="text-xs text-slate-500 mt-1">{company?.address}</p>
                        <p className="text-xs text-slate-500">{company?.phone} | {company?.email}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">INVOICE</h2>
                        <p className="font-mono text-slate-500 mt-2">#{invoice.invoice_number}</p>
                        <div className="mt-4 space-y-1 text-xs text-slate-500">
                            <p>Issued: {safeFormat(invoice.issue_date || invoice.created_at, 'MMM dd, yyyy')}</p>
                            <p>Due: {safeFormat(invoice.due_date, 'MMM dd, yyyy') || 'Upon Receipt'}</p>
                        </div>
                    </div>
                </div>

                {/* Bill To */}
                <div className="grid grid-cols-2 gap-12 mb-12">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Bill To</h3>
                        <p className="text-lg font-bold text-slate-900">{invoice.recipient_name}</p>
                        <p className="text-slate-500">{invoice.recipient_email}</p>
                        {property && (
                            <p className="text-slate-500 mt-2">Property: {property.address} {property.unit_number && `#${property.unit_number}`}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Amount Due</h3>
                        <p className="text-4xl font-black text-slate-900">${Number(invoice.total).toLocaleString()}</p>
                    </div>
                </div>

                {/* Line Items Table */}
                <div className="mb-12">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-slate-900">
                                <th className="text-left py-3 font-black uppercase text-[10px] tracking-widest text-slate-600">Description</th>
                                <th className="text-center py-3 font-black uppercase text-[10px] tracking-widest text-slate-600">Qty</th>
                                <th className="text-right py-3 font-black uppercase text-[10px] tracking-widest text-slate-600">Amount</th>
                                <th className="text-right py-3 font-black uppercase text-[10px] tracking-widest text-slate-600">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(items) && items.map((item: any, index: number) => (
                                <tr key={index} className="border-b border-slate-100">
                                    <td className="py-4 font-medium text-slate-800">{item.description || 'Line Item'}</td>
                                    <td className="py-4 text-center text-slate-600">{item.quantity || 1}</td>
                                    <td className="py-4 text-right text-slate-600">${Number(item.amount || 0).toLocaleString()}</td>
                                    <td className="py-4 text-right font-bold text-slate-900">${(Number(item.amount || 0) * (item.quantity || 1)).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-72 space-y-2">
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>Subtotal</span>
                            <span>${Number(invoice.subtotal || 0).toLocaleString()}</span>
                        </div>
                        {invoice.tax_amount > 0 && (
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Tax</span>
                                <span>${Number(invoice.tax_amount).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xl font-black text-slate-900 pt-4 border-t-2 border-slate-900">
                            <span>Total</span>
                            <span>${Number(invoice.total || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                    <div className="bg-slate-50 rounded-xl p-6 mb-12">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Notes &amp; Terms</h3>
                        <p className="text-sm text-slate-600">{invoice.notes}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-auto pt-8 border-t border-slate-100 text-center text-[10px] text-slate-400 uppercase tracking-widest">
                    Thank you for your business &bull; {company?.name || 'PropFlow'}
                </div>
            </div>
        </div>
    )
}
