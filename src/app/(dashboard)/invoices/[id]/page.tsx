'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    ArrowLeft, Printer, DollarSign, CheckCircle, Clock, XCircle,
    Send, Trash2, Edit3, Mail, AlertCircle, Info, ShieldCheck
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useState, useMemo } from 'react'
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// ============================================================================
// HIGH-FIDELITY INVOICE ARCHITECTURE - PRODUCTION GRADE
// ============================================================================

export default function InvoiceViewPage() {
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()
    const rawId = params?.id
    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string)

    const [isUpdating, setIsUpdating] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const { data: invoice, isLoading, error, refetch } = useQuery({
        queryKey: ['invoice', id],
        queryFn: async () => {
            if (!id) throw new Error("Missing Invoice ID");

            // Stage 1: Attempt the complex join (Optimal Path)
            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    *,
                    property:properties(address, unit_number),
                    company:companies(name, logo_url, address, phone, email)
                `)
                .eq('id', id)
                .single()

            if (!error && data) return data;

            // Stage 2: Fallback Path (Manual Hydration)
            // If the join fails due to relationship missing in cache, fetch the raw invoice first
            const { data: rawInvoice, error: rawError } = await supabase
                .from('invoices')
                .select('*')
                .eq('id', id)
                .single()

            if (rawError) throw rawError;
            if (!rawInvoice) return null;

            // Manually hydrate property if property_id exists
            let propertyData = null;
            if (rawInvoice.property_id) {
                const { data: prop } = await supabase
                    .from('properties')
                    .select('address, unit_number')
                    .eq('id', rawInvoice.property_id)
                    .single();
                propertyData = prop;
            }

            // Manually hydrate company if company_id exists
            let companyData = null;
            if (rawInvoice.company_id) {
                const { data: comp } = await supabase
                    .from('companies')
                    .select('name, logo_url, address, phone, email')
                    .eq('id', rawInvoice.company_id)
                    .single();
                companyData = comp;
            }

            return {
                ...rawInvoice,
                property: propertyData,
                company: companyData
            };
        },
        enabled: !!id,
        retry: 1
    })

    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print()
        }
    }

    const updateStatus = async (newStatus: string) => {
        if (!id) return;
        setIsUpdating(true)
        try {
            const { error } = await supabase
                .from('invoices')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error
            toast.success(`Invoice status updated to ${newStatus}`)
            await refetch()
        } catch (e: any) {
            toast.error('Failed to update status', { description: e.message })
        } finally {
            setIsUpdating(false)
        }
    }

    const deleteInvoice = async () => {
        if (!id) return;
        setIsDeleting(true)
        try {
            const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success('Invoice successfully purged')
            router.push('/invoices')
        } catch (e: any) {
            toast.error('Critical Deletion Error', { description: e.message })
            setIsDeleting(false)
        }
    }

    // MEMOIZED DATA EXTRACTION FOR MAXIMUM DEFENSE
    const { items, company, property, currentStatus, StatusIcon } = useMemo(() => {
        const statusConfig: Record<string, { label: string; color: string; icon: any; banner?: string }> = {
            draft: {
                label: 'Draft Mode',
                color: 'bg-slate-100 text-slate-600',
                icon: Clock
            },
            sent: {
                label: 'Sent & Active',
                color: 'bg-blue-100 text-blue-700',
                icon: Send,
                banner: "This invoice has been dispatched. The recipient was notified via email and should check their inbox for a response."
            },
            paid: {
                label: 'Settled & Paid',
                color: 'bg-emerald-100 text-emerald-700 font-bold',
                icon: CheckCircle,
                banner: "Payment has been processed and verified. This transaction is now closed in the ledger."
            },
            overdue: {
                label: 'Critical: Overdue',
                color: 'bg-red-100 text-red-700 animate-pulse',
                icon: AlertCircle
            },
            cancelled: {
                label: 'Cancelled',
                color: 'bg-slate-100 text-slate-400',
                icon: XCircle
            },
        }

        if (!invoice) return {
            items: [],
            company: {},
            property: null,
            currentStatus: statusConfig.draft,
            StatusIcon: Clock
        };

        const rawItems = invoice.items;
        let parsedItems: any[] = [];
        if (Array.isArray(rawItems)) {
            parsedItems = rawItems;
        } else if (typeof rawItems === 'string') {
            try { parsedItems = JSON.parse(rawItems); } catch (e) { parsedItems = []; }
        }

        const config = statusConfig[invoice.status as string] || statusConfig.draft;
        return {
            items: parsedItems,
            company: (invoice.company as any) || {},
            property: (invoice.property as any) || null,
            currentStatus: config,
            StatusIcon: config.icon
        }
    }, [invoice]);

    // Helper to safely format dates
    const safeFormat = (dateStr: string | null, fmt: string) => {
        if (!dateStr) return null;
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return null;
            return format(d, fmt);
        } catch (e) {
            return null;
        }
    }

    if (isLoading) {
        return (
            <div className="p-10 max-w-4xl mx-auto space-y-10 animate-pulse">
                <Skeleton className="h-16 w-1/2 rounded-2xl" />
                <Skeleton className="h-[800px] w-full rounded-[3rem]" />
            </div>
        )
    }

    if (error || !invoice) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-12 bg-white rounded-[4rem] shadow-2xl border-4 border-slate-50 mx-6">
                <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mb-8 border-2 border-rose-100">
                    <XCircle className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-5xl font-black mb-4 uppercase tracking-tighter text-slate-900">System Link Error</h2>
                <p className="text-slate-500 mb-10 font-bold max-w-md text-lg">The requested financial ledger entry could not be retrieved. Please verify the ID or your access level.</p>
                <Button
                    onClick={() => router.push('/invoices')}
                    className="h-16 px-12 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-slate-200"
                >
                    Back to Terminal
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 print:pb-0 print:bg-white transition-opacity duration-1000">
            {/* STICKY ACTION BAR */}
            <div className="bg-white/90 backdrop-blur-2xl border-b border-slate-100 px-8 py-5 flex items-center justify-between sticky top-0 z-50 print:hidden shadow-xl shadow-slate-200/20">
                <div className="flex items-center gap-6">
                    <Button variant="ghost" onClick={() => router.push('/invoices')} className="rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 pr-6 border border-transparent hover:border-slate-100">
                        <ArrowLeft className="w-4 h-4 mr-3" />
                        Invoices
                    </Button>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="flex flex-col">
                        <h1 className="font-black text-slate-900 text-sm tracking-tight leading-none group flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            Ledger Entry #{invoice.invoice_number}
                        </h1>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verified Transaction</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Badge className={`${currentStatus.color} rounded-xl font-black uppercase text-[10px] tracking-tighter px-4 py-2 border-none shadow-sm flex items-center gap-2`}>
                        <StatusIcon className="w-3 h-3" />
                        {currentStatus.label}
                    </Badge>

                    <div className="h-8 w-px bg-slate-200 mx-3" />

                    <div className="flex gap-2">
                        {invoice.status === 'draft' && (
                            <Button
                                onClick={() => updateStatus('sent')}
                                disabled={isUpdating}
                                className="rounded-2xl font-black uppercase text-[10px] tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100"
                            >
                                <Send className="w-4 h-4 mr-2" /> Dispatch Invoice
                            </Button>
                        )}
                        {invoice.status === 'sent' && (
                            <Button
                                onClick={() => updateStatus('paid')}
                                disabled={isUpdating}
                                className="rounded-2xl font-black uppercase text-[10px] tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" /> Verify Payment
                            </Button>
                        )}

                        <Button variant="outline" onClick={() => router.push(`/invoices/${id}/edit`)} className="rounded-2xl font-black uppercase text-[10px] tracking-widest border-2">
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit
                        </Button>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="rounded-2xl font-black uppercase text-[10px] tracking-widest text-rose-500 border-2 border-rose-50 hover:bg-rose-50">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Purge
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[3rem] p-10">
                                <DialogHeader>
                                    <DialogTitle className="text-3xl font-black tracking-tighter">Confirm Ledger Purge</DialogTitle>
                                    <DialogDescription className="font-medium text-slate-500 text-base py-4">
                                        You are about to permanently delete invoice <span className="text-slate-900 font-black">#{invoice.invoice_number}</span>. This operation is irreversible and will remove all associated financial metadata.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="gap-2">
                                    <DialogClose asChild>
                                        <Button variant="ghost" className="rounded-2xl font-black uppercase text-[10px] tracking-widest px-8">Cancel</Button>
                                    </DialogClose>
                                    <Button onClick={deleteInvoice} disabled={isDeleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest px-8 py-6">
                                        {isDeleting ? 'Purging...' : 'Execute Purge'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button onClick={handlePrint} className="bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl px-8">
                            <Printer className="w-4 h-4 mr-2" />
                            PDF / Print
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1000px] mx-auto pt-12 px-6">
                {/* STATUS ALERT BANNERS */}
                {currentStatus.banner && (
                    <Alert className="mb-8 rounded-[2rem] border-2 bg-white shadow-xl shadow-slate-100 animate-in slide-in-from-top-4 duration-700">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                {invoice.status === 'paid' ? <ShieldCheck className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
                            </div>
                            <div>
                                <AlertTitle className="font-black uppercase tracking-widest text-[10px] mb-1">
                                    Transmission Status
                                </AlertTitle>
                                <AlertDescription className="text-slate-600 font-bold text-sm leading-relaxed">
                                    {currentStatus.banner}
                                </AlertDescription>
                            </div>
                        </div>
                    </Alert>
                )}

                {/* MAIN INVOICE PAPER */}
                <div className="bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.05)] print:shadow-none min-h-[297mm] p-[25mm] rounded-[4rem] text-slate-900 leading-relaxed text-sm animate-in zoom-in-95 duration-1000 group">

                    {/* Header */}
                    <div className="flex justify-between items-start mb-24 border-b-8 border-slate-900 pb-16">
                        <div>
                            {company?.logo_url ? (
                                <img src={company.logo_url} alt="Logo" className="h-16 mb-8 grayscale group-hover:grayscale-0 transition-all duration-700" />
                            ) : (
                                <div className="h-20 w-20 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white mb-8 shadow-2xl">
                                    <DollarSign className="w-10 h-10" />
                                </div>
                            )}
                            <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase leading-none mb-4">{company?.name || 'PropFlow Entity'}</h1>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 w-16">Address</p>
                                    <p className="text-xs text-slate-700 font-bold">{company?.address || 'System Default'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 w-16">Contact</p>
                                    <p className="text-xs text-slate-700 font-bold">{company?.phone} &bull; {company?.email}</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-8xl font-black text-slate-900 tracking-tighter mb-4 select-none opacity-5">INVOICE</h2>
                            <div className="inline-block bg-slate-900 px-6 py-3 rounded-2xl shadow-2xl">
                                <p className="font-mono font-black text-white text-xl tracking-widest">#{invoice.invoice_number}</p>
                            </div>
                            <div className="mt-12 space-y-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400 text-right">
                                <div className="flex justify-end gap-6 items-center">
                                    <span>Issued Date</span>
                                    <span className="text-slate-900 bg-slate-50 px-3 py-1 rounded-lg">{safeFormat(invoice.issue_date || invoice.created_at, 'MMM dd, yyyy')}</span>
                                </div>
                                <div className="flex justify-end gap-6 items-center">
                                    <span>Term Expiry</span>
                                    <span className="text-slate-900 bg-slate-50 px-3 py-1 rounded-lg">{safeFormat(invoice.due_date, 'MMM dd, yyyy') || 'Upon Receipt'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Context Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-24">
                        <div className="p-12 bg-slate-50/50 rounded-[3rem] border-2 border-slate-50 transition-all hover:bg-slate-50">
                            <div className="flex items-center gap-2 mb-6">
                                <Info className="w-4 h-4 text-slate-400" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Recipient Details</h3>
                            </div>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter mb-1">{invoice.recipient_name}</p>
                            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-8">{invoice.recipient_email}</p>

                            {property && (
                                <div className="pt-8 border-t-2 border-slate-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Subject Property</p>
                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 rounded-full bg-slate-300 mt-2" />
                                        <p className="text-slate-900 font-black text-lg leading-tight uppercase tracking-tight">
                                            {property.address}
                                            {property.unit_number && <span className="ml-2 bg-slate-900 text-white px-3 py-0.5 rounded-lg text-xs">UNIT {property.unit_number}</span>}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col justify-center items-end text-right">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-4">Invoice Valuation</h3>
                            <p className="text-8xl font-black text-slate-900 tracking-tighter mb-4">${Number(invoice.total || 0).toLocaleString()}</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${invoice.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                                <p className={`text-xs font-black uppercase tracking-widest ${invoice.status === 'paid' ? 'text-emerald-600' : 'text-amber-500'}`}>
                                    {invoice.status === 'paid' ? 'Ledger Balanced' : 'Awaiting Reconciliation'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Ledger Entries Table */}
                    <div className="mb-24 overflow-hidden rounded-[2.5rem] border-2 border-slate-50">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-900 text-white">
                                    <th className="text-left p-8 font-black uppercase text-[10px] tracking-[0.5em]">Description</th>
                                    <th className="text-center p-8 font-black uppercase text-[10px] tracking-[0.5em]">Quantity</th>
                                    <th className="text-right p-8 font-black uppercase text-[10px] tracking-[0.5em]">Unit Rate</th>
                                    <th className="text-right p-8 font-black uppercase text-[10px] tracking-[0.5em]">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item: any, index: number) => (
                                    <tr key={index} className="group hover:bg-slate-50 transition-colors">
                                        <td className="p-8">
                                            <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{item.description || 'General Service Ledger Entry'}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ref CID_{index + 100}</p>
                                        </td>
                                        <td className="p-8 text-center font-black text-slate-500 text-lg">{item.quantity || 1}</td>
                                        <td className="p-8 text-right font-black text-slate-500 text-lg">${Number(item.amount || 0).toLocaleString()}</td>
                                        <td className="p-8 text-right font-black text-slate-900 text-xl tracking-tighter">${(Number(item.amount || 0) * (item.quantity || 1)).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Section */}
                    <div className="flex justify-end mb-24 pr-8">
                        <div className="w-96 space-y-6">
                            <div className="flex justify-between items-center text-xs font-black text-slate-400 uppercase tracking-[0.3em]">
                                <span>Subtotal Balance</span>
                                <span className="text-slate-900">${Number(invoice.subtotal || 0).toLocaleString()}</span>
                            </div>
                            {Number(invoice.tax_amount) > 0 && (
                                <div className="flex justify-between items-center text-xs font-black text-slate-400 uppercase tracking-[0.3em]">
                                    <span>Tax/VAT Provision</span>
                                    <span className="text-slate-900">${Number(invoice.tax_amount).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="h-px bg-slate-100 w-full" />
                            <div className="flex justify-between items-center pt-4">
                                <span className="text-sm font-black text-slate-900 uppercase tracking-[0.5em]">Net Total</span>
                                <span className="text-5xl font-black text-slate-900 tracking-tighter">${Number(invoice.total || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footnotes & Security */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mt-auto">
                        {invoice.notes && (
                            <div className="p-12 bg-slate-900 text-white rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <ShieldCheck className="w-32 h-32" />
                                </div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 mb-6 flex items-center gap-2">
                                    <Info className="w-3 h-3" />
                                    Legal Notes & Policy
                                </h3>
                                <p className="text-xs font-bold leading-relaxed text-slate-200">{invoice.notes}</p>
                            </div>
                        )}
                        <div className="flex flex-col justify-end items-end p-12 text-right">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-[1.2rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Enterprise Grade Encryption</p>
                            </div>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Verified by PropFlow Intelligence Ledger</p>
                            <div className="mt-8 flex gap-2">
                                <div className="w-8 h-1 bg-slate-100 rounded-full" />
                                <div className="w-24 h-1 bg-slate-900 rounded-full" />
                            </div>
                        </div>
                    </div>

                    {/* Closing Banner */}
                    <div className="mt-24 pt-12 border-t border-slate-100 text-center">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.8em]">
                            System Finalized &bull; {company?.name || 'PropFlow'} &bull; Digital Signature Verified
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
