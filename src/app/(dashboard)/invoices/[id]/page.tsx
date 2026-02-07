'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Printer, DollarSign, CheckCircle, Clock, XCircle, Send, Trash2, Edit3 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"

// ============================================================================
// PRODUCTION INVOICE VIEWER - Fully Branded & Printable
// ============================================================================

export default function InvoiceViewPage() {
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()
    const id = params?.id as string
    const [isUpdating, setIsUpdating] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const { data: invoice, isLoading, error, refetch } = useQuery({
        queryKey: ['invoice', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('invoices')
                .select('*, property:properties(address, unit_number), company:companies(name, logo_url, address, phone, email)')
                .eq('id', id)
                .single()

            if (error) throw error
            return data
        },
        enabled: !!id
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

    const deleteInvoice = async () => {
        setIsDeleting(true)
        try {
            const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success('Invoice deleted successfully')
            router.push('/invoices')
        } catch (e: any) {
            toast.error('Failed to delete invoice', { description: e.message })
            setIsDeleting(false)
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
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 text-slate-900">
                <XCircle className="w-16 h-16 text-rose-500 mb-6" />
                <h2 className="text-4xl font-black mb-2 uppercase tracking-tighter">Invoice Not Found</h2>
                <p className="text-slate-500 mb-8 font-medium">The invoice you are looking for does not exist or you do not have permission.</p>
                <Button
                    onClick={() => router.push('/invoices')}
                    className="h-14 px-10 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                    Back to Invoices
                </Button>
            </div>
        )
    }

    const company = invoice.company as any;
    const property = invoice.property as any;
    const items = Array.isArray(invoice.items) ? invoice.items : [];

    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
        draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600', icon: Clock },
        sent: { label: 'Awaiting Payment', color: 'bg-blue-100 text-blue-700', icon: Send },
        paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
        overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: XCircle },
        cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-400', icon: XCircle },
    }
    const currentStatus = statusConfig[invoice.status as string] || statusConfig.draft;
    const StatusIcon = currentStatus.icon;

    // Helper to safely format dates
    const safeFormat = (dateStr: string | null, fmt: string) => {
        if (!dateStr) return null;
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? null : format(d, fmt);
        } catch (e) {
            return null;
        }
    }

    return (
        <div className="min-h-screen bg-slate-100/50 pb-20 print:pb-0 print:bg-white animate-in fade-in duration-500">
            {/* Toolbar */}
            <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 print:hidden mb-8 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push('/invoices')} className="rounded-xl font-bold hover:bg-slate-100">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-6 w-px bg-slate-200" />
                    <h1 className="font-bold text-slate-900 hidden md:block">Invoice #{invoice.invoice_number}</h1>
                    <Badge className={`${currentStatus.color} rounded-lg font-bold uppercase text-[10px] tracking-widest px-3 py-1 border-none`}>
                        <StatusIcon className="w-3 h-3 mr-1.5" />
                        {currentStatus.label}
                    </Badge>
                </div>
                <div className="flex gap-2">
                    {/* Status Management Buttons */}
                    {invoice.status === 'draft' && (
                        <Button
                            variant="outline"
                            onClick={() => updateStatus('sent')}
                            disabled={isUpdating}
                            className="rounded-xl font-bold text-blue-600 border-blue-100 hover:bg-blue-50"
                        >
                            <Send className="w-4 h-4 mr-2" /> Mark as Sent
                        </Button>
                    )}
                    {invoice.status === 'sent' && (
                        <Button
                            variant="outline"
                            onClick={() => updateStatus('paid')}
                            disabled={isUpdating}
                            className="rounded-xl font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" /> Mark as Paid
                        </Button>
                    )}

                    <div className="h-8 w-px bg-slate-200 mx-2" />

                    <Button variant="outline" onClick={() => router.push(`/invoices/${id}/edit`)} className="rounded-xl font-bold">
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                    </Button>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="rounded-xl font-bold text-red-600 border-red-100 hover:bg-red-50">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[2rem]">
                            <DialogHeader>
                                <DialogTitle>Are you absolutely sure?</DialogTitle>
                                <DialogDescription>
                                    This will permanently delete invoice #{invoice.invoice_number}. This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline" className="rounded-xl">Cancel</Button>
                                </DialogClose>
                                <Button onClick={deleteInvoice} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white rounded-xl">
                                    {isDeleting ? 'Deleting...' : 'Delete Invoice'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button onClick={handlePrint} className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold shadow-lg shadow-slate-200">
                        <Printer className="w-4 h-4 mr-2" />
                        Print / PDF
                    </Button>
                </div>
            </div>

            {/* Invoice Paper */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none print:max-w-none min-h-[297mm] p-[20mm] text-slate-900 leading-relaxed text-sm animate-in slide-in-from-bottom-8 duration-700">

                {/* Header */}
                <div className="flex justify-between items-start mb-16 border-b-4 border-slate-900 pb-12">
                    <div>
                        {company?.logo_url ? (
                            <img src={company.logo_url} alt="Logo" className="h-16 mb-6 grayscale hover:grayscale-0 transition-all duration-500" />
                        ) : (
                            <div className="h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white mb-6">
                                <DollarSign className="w-8 h-8" />
                            </div>
                        )}
                        <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase leading-none">{company?.name || 'PropFlow Entity'}</h1>
                        <div className="mt-4 space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Address</p>
                            <p className="text-xs text-slate-600 font-medium">{company?.address || 'Address not set in Settings'}</p>
                            <p className="text-xs text-slate-600 font-medium">{company?.phone} &bull; {company?.email}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-6xl font-black text-slate-900 tracking-tighter mb-2">INVOICE</h2>
                        <div className="inline-block bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                            <p className="font-mono font-bold text-slate-900">NO. {invoice.invoice_number}</p>
                        </div>
                        <div className="mt-8 space-y-1 text-xs font-bold uppercase tracking-widest text-slate-400 text-right">
                            <p>Issued: <span className="text-slate-900 ml-2">{safeFormat(invoice.issue_date || invoice.created_at, 'MMM dd, yyyy')}</span></p>
                            <p>Due: <span className="text-slate-900 ml-2">{safeFormat(invoice.due_date, 'MMM dd, yyyy') || 'Upon Receipt'}</span></p>
                        </div>
                    </div>
                </div>

                {/* Bill To */}
                <div className="grid grid-cols-2 gap-12 mb-16">
                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Recipient Info</h3>
                        <p className="text-xl font-black text-slate-900">{invoice.recipient_name}</p>
                        <p className="text-slate-500 font-medium mb-4">{invoice.recipient_email}</p>
                        {property && (
                            <div className="pt-4 border-t border-slate-200">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Property Link</p>
                                <p className="text-slate-700 font-bold">{property.address} {property.unit_number && `#${property.unit_number}`}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col justify-center items-end text-right">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Grand Total Due</h3>
                        <p className="text-6xl font-black text-slate-900 tracking-tighter">${Number(invoice.total || 0).toLocaleString()}</p>
                        <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mt-2">{invoice.status === 'paid' ? 'Paid in Full' : 'Amount Outstanding'}</p>
                    </div>
                </div>

                {/* Line Items Table */}
                <div className="mb-16">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-4 border-slate-900">
                                <th className="text-left py-4 font-black uppercase text-[10px] tracking-[0.3em] text-slate-400">Description</th>
                                <th className="text-center py-4 font-black uppercase text-[10px] tracking-[0.3em] text-slate-400">Qty</th>
                                <th className="text-right py-4 font-black uppercase text-[10px] tracking-[0.3em] text-slate-400">Rate</th>
                                <th className="text-right py-4 font-black uppercase text-[10px] tracking-[0.3em] text-slate-400">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item: any, index: number) => (
                                <tr key={index} className="group">
                                    <td className="py-6 font-bold text-slate-900 text-base">{item.description || 'General Service'}</td>
                                    <td className="py-6 text-center font-bold text-slate-500">{item.quantity || 1}</td>
                                    <td className="py-6 text-right font-bold text-slate-500">${Number(item.amount || 0).toLocaleString()}</td>
                                    <td className="py-6 text-right font-black text-slate-900 text-base">${(Number(item.amount || 0) * (item.quantity || 1)).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div className="flex justify-end mb-16">
                    <div className="w-80 space-y-4">
                        <div className="flex justify-between items-center text-sm font-bold text-slate-500 uppercase tracking-widest">
                            <span>Subtotal</span>
                            <span className="text-slate-900">${Number(invoice.subtotal || 0).toLocaleString()}</span>
                        </div>
                        {Number(invoice.tax_amount) > 0 && (
                            <div className="flex justify-between items-center text-sm font-bold text-slate-500 uppercase tracking-widest">
                                <span>Tax/VAT</span>
                                <span className="text-slate-900">${Number(invoice.tax_amount).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-3xl font-black text-slate-900 pt-6 border-t-[6px] border-slate-900">
                            <span className="tracking-tighter uppercase">Total</span>
                            <span className="tracking-tighter">${Number(invoice.total || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Notes & Terms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-auto">
                    {invoice.notes && (
                        <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3">Notes &amp; Terms</h3>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed">{invoice.notes}</p>
                        </div>
                    )}
                    <div className="flex flex-col justify-end items-end p-8 text-right">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                                <CheckCircle className="w-4 h-4" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Secure Billing Certified</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PropFlow High-Fidelity Ledger</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-16 pt-8 border-t border-slate-100 text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.5em]">
                    Thank you for your business &bull; Verified Transaction &bull; {company?.name || 'PropFlow'}
                </div>
            </div>
        </div>
    )
}
