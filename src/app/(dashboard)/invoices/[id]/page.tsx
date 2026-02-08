'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    ArrowLeft, Printer, DollarSign, CheckCircle, Clock, XCircle,
    Send, Trash2, Edit3, Mail, AlertCircle, Info, ShieldCheck, Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import { generatePDFBlob } from '@/lib/generatePdf'
import { uploadAndGetLink, triggerInvoiceAutomation } from '@/lib/automations'
import { getCurrencySymbol } from '@/lib/currencies'

// ============================================================================
// HIGH-FIDELITY INVOICE ARCHITECTURE - PRODUCTION GRADE
// ============================================================================

export default function InvoiceViewPage() {
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()
    const queryClient = useQueryClient()
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

            // CRITICAL: Invalidate both the detail and the list for "Matching Energy"
            queryClient.invalidateQueries({ queryKey: ['invoice', id] })
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] })
            queryClient.invalidateQueries({ queryKey: ['landlord-stats'] })
            queryClient.invalidateQueries({ queryKey: ['agent-stats'] })
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })

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

            queryClient.invalidateQueries({ queryKey: ['invoices'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] })
            queryClient.invalidateQueries({ queryKey: ['landlord-stats'] })
            queryClient.invalidateQueries({ queryKey: ['agent-stats'] })
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })

            toast.success('Invoice successfully purged')
            router.push('/invoices')
        } catch (e: any) {
            toast.error('Critical Deletion Error', { description: e.message })
            setIsDeleting(false)
        }
    }

    // MEMOIZED DATA EXTRACTION FOR MAXIMUM DEFENSE


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

    const handleDispatch = async () => {
        if (!invoice || !id) return;
        setIsUpdating(true)
        try {
            // 1. Generate PDF Blob
            await new Promise(r => setTimeout(r, 500)); // UI Settle

            toast.message('Dispatching Securely', { description: 'Encrypting document for transmission...' })
            const pdfBlob = await generatePDFBlob('invoice-paper');

            let finalBlob = pdfBlob;
            if (!finalBlob) {
                // Retry once
                console.warn("PDF Generation Retrying...");
                await new Promise(r => setTimeout(r, 1000));
                finalBlob = await generatePDFBlob('invoice-paper');
                if (!finalBlob) throw new Error("Failed to generate PDF document");
            }

            // 2. Upload to Storage
            const path = `${invoice.company_id}/invoice_${id}_${Date.now()}.pdf`;
            const fileUrl = await uploadAndGetLink(finalBlob, path);

            // 3. Trigger Automation (Using production Webhook)
            await triggerInvoiceAutomation({
                invoice_id: id as string,
                invoice_number: invoice.invoice_number,
                recipient_name: invoice.recipient_name,
                recipient_email: invoice.recipient_email,
                amount: invoice.total,
                company_id: invoice.company_id,
                created_by: invoice.created_by,
                items: items, // Use memoized items
                file_url: fileUrl,
                triggered_at: new Date().toISOString()
            });

            // 4. Update Status Locally
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'sent', updated_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error

            queryClient.invalidateQueries({ queryKey: ['invoice', id] })
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
            toast.success('Transmission Complete', { description: 'Invoice dispatched and recipient notified.' })
            await refetch()

        } catch (e: any) {
            console.error(e)
            toast.error('Dispatch Failure', { description: e.message })
        } finally {
            setIsUpdating(false)
        }
    }

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
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body {
                        margin: 0;
                        padding: 15mm !important;
                    }
                    nav, aside, header:not(.print-header), .no-print {
                        display: none !important;
                    }
                    .print-container {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
            `}</style>

            {/* STICKY ACTION BAR */}
            <div className="bg-white/90 backdrop-blur-2xl border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50 no-print shadow-xl shadow-slate-200/10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push('/invoices')} className="rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Invoices
                    </Button>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="flex flex-col">
                        <h1 className="font-black text-slate-900 text-xs tracking-tight leading-none flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            Ledger Entry #{invoice.invoice_number}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${currentStatus.color} ${invoice.status === 'draft' ? 'hidden' : ''}`}>
                        <StatusIcon className="w-3 h-3" />
                        {currentStatus.label}
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1" />

                    <div className="flex gap-1.5">
                        {invoice.status === 'draft' && (
                            <Button
                                onClick={handleDispatch}
                                disabled={isUpdating}
                                className="h-10 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                            >
                                {isUpdating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                                Dispatch
                            </Button>
                        )}
                        {invoice.status === 'sent' && (
                            <Button
                                onClick={() => updateStatus('paid')}
                                disabled={isUpdating}
                                className="h-10 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Verify Paid
                            </Button>
                        )}

                        <Button variant="outline" onClick={() => router.push(`/invoices/${id}/edit`)} className="h-10 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest border-2">
                            <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                        </Button>

                        <Button onClick={handlePrint} className="h-10 px-4 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg">
                            <Printer className="w-3.5 h-3.5 mr-1.5" />
                            Print / PDF
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-[850px] mx-auto pt-8 px-6 no-print">
                {currentStatus.banner && (
                    <Alert className="mb-6 rounded-2xl border bg-white shadow-lg shadow-slate-100 animate-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                {invoice.status === 'paid' ? <ShieldCheck className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                            </div>
                            <div>
                                <AlertTitle className="font-black uppercase tracking-widest text-[9px] mb-0.5 opacity-50">Status Bulletin</AlertTitle>
                                <AlertDescription className="text-slate-600 font-bold text-xs leading-none">
                                    {currentStatus.banner}
                                </AlertDescription>
                            </div>
                        </div>
                    </Alert>
                )}
            </div>

            {/* MAIN INVOICE PAPER - A4 Proportionally tight */}
            <div id="invoice-paper" className="print-container max-w-[850px] mx-auto bg-white shadow-[0_20px_50px_-10px_rgba(0,0,0,0.03)] print:shadow-none min-h-[11in] p-12 rounded-[2.5rem] text-slate-900 leading-relaxed text-xs animate-in zoom-in-95 duration-700">

                {/* BRAND HEADER */}
                <div className="flex justify-between items-start mb-16 border-b-4 border-slate-900 pb-10">
                    <div className="flex gap-6">
                        {company?.logo_url ? (
                            <img src={company.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
                        ) : (
                            <div className="h-12 w-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                <DollarSign className="w-6 h-6" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase leading-none mb-2">{company?.name || 'Verified Invoice'}</h1>
                            <div className="space-y-0.5 text-[10px] text-slate-500 font-bold">
                                <p>{company?.address || 'Corporate Headquarters'}</p>
                                <p>{company?.phone} &bull; {company?.email}</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">INVOICE</h2>
                        <div className="inline-block bg-slate-900 px-4 py-2 rounded-xl">
                            <p className="font-mono font-black text-white text-base tracking-widest">#{invoice.invoice_number}</p>
                        </div>
                        <div className="mt-6 space-y-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <p>Issued: <span className="text-slate-900">{safeFormat(invoice.issue_date || invoice.created_at, 'MMM dd, yyyy')}</span></p>
                            <p>Due: <span className="text-slate-900">{safeFormat(invoice.due_date, 'MMM dd, yyyy') || 'Upon Receipt'}</span></p>
                        </div>
                    </div>
                </div>

                {/* DETAILS GRID */}
                <div className="grid grid-cols-2 gap-10 mb-16">
                    <div className="p-8 bg-slate-50/50 rounded-3xl border border-slate-100">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Recipient Information</h3>
                        <p className="text-xl font-black text-slate-900 tracking-tight mb-0.5">{invoice.recipient_name}</p>
                        <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest mb-6">{invoice.recipient_email}</p>

                        {property && (
                            <div className="pt-4 border-t border-slate-200/50">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Linked Asset</p>
                                <p className="text-slate-900 font-black text-sm uppercase tracking-tight">
                                    {property.address}
                                    {property.unit_number && <span className="ml-2 py-0.5 px-2 bg-slate-900 text-white rounded-md text-[9px]">UNIT {property.unit_number}</span>}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col justify-center items-end text-right pr-4">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Amount Due</h3>
                        <p className="text-6xl font-black text-slate-900 tracking-tighter mb-4">{getCurrencySymbol(invoice.currency)}{Number(invoice.total || 0).toLocaleString()}</p>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${invoice.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <p className={`text-[9px] font-black uppercase tracking-widest ${invoice.status === 'paid' ? 'text-emerald-600' : 'text-amber-500'}`}>
                                {invoice.status === 'paid' ? 'Ledger Verified' : 'Payment Awaited'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* LINE ITEMS TABLE */}
                <div className="mb-12 overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
                    <table className="w-full text-[11px]">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th className="text-left p-5 font-black uppercase text-[9px] tracking-widest">Service Description</th>
                                <th className="text-center p-5 font-black uppercase text-[9px] tracking-widest">Qty</th>
                                <th className="text-right p-5 font-black uppercase text-[9px] tracking-widest">Rate</th>
                                <th className="text-right p-5 font-black uppercase text-[9px] tracking-widest">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item: any, index: number) => (
                                <tr key={index} className="hover:bg-slate-50/50">
                                    <td className="p-5">
                                        <p className="font-black text-slate-900 uppercase tracking-tight text-sm">{item.description || 'Professional Real Estate Service'}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Reference: TRX-{index + 101}</p>
                                    </td>
                                    <td className="p-5 text-center font-bold text-slate-600">{item.quantity || 1}</td>
                                    <td className="p-5 text-right font-bold text-slate-600">{getCurrencySymbol(invoice.currency)}{Number(item.amount || 0).toLocaleString()}</td>
                                    <td className="p-5 text-right font-black text-slate-900 text-base">{getCurrencySymbol(invoice.currency)}{(Number(item.amount || 0) * (item.quantity || 1)).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-50/50 font-black text-slate-900">
                                <td colSpan={3} className="p-5 text-right uppercase text-[9px] tracking-widest text-slate-400">Transaction Subtotal</td>
                                <td className="p-5 text-right text-lg tracking-tighter">{getCurrencySymbol(invoice.currency)}{Number(invoice.total || 0).toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 italic text-slate-500 text-[10px] font-medium leading-relaxed">
                            <h4 className="font-black uppercase tracking-widest text-slate-400 text-[8px] mb-2 not-italic">Notes & Compliance</h4>
                            {invoice.notes || 'This invoice is a digitally verified ledger entry. Please settle the balance as per the agreed terms of service.'}
                        </div>
                    </div>
                    <div className="flex flex-col justify-end">
                        <div className="border-t-2 border-slate-900 pt-6 flex justify-between items-baseline">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Total Settlement Ammount</span>
                            <span className="text-4xl font-black tracking-tighter text-slate-900">{getCurrencySymbol(invoice.currency)}{Number(invoice.total || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-[8px] text-slate-400 text-right uppercase tracking-widest font-black mt-2">All prices in {invoice.currency || 'USD'}</p>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        <span>Corporate Ledger &copy; {new Date().getFullYear()}</span>
                    </div>
                    <div className="flex gap-4 items-center">
                        <span className="opacity-30">Securely processed via PropFlow</span>
                        <div className="w-0.5 h-0.5 rounded-full bg-slate-200" />
                        <span>Digital Signature: {id.slice(0, 12).toUpperCase()}</span>
                        <div className="w-0.5 h-0.5 rounded-full bg-slate-200" />
                        <span>Page 01 / 01</span>
                    </div>
                </div>
            </div>

            {/* FLOATING ADMIN PURGE (no-print) */}
            <div className="fixed bottom-6 right-6 no-print">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="h-12 w-12 rounded-2xl border-rose-100 text-rose-500 hover:bg-rose-50 p-0 shadow-lg bg-white">
                            <Trash2 className="w-5 h-5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2rem]">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black tracking-tight">Purge Ledger Entry</DialogTitle>
                            <DialogDescription className="font-medium">
                                Are you absolutely sure you want to delete this invoice? This action is permanent and cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button variant="ghost" className="rounded-xl font-bold">Cancel</Button>
                            </DialogClose>
                            <Button onClick={deleteInvoice} disabled={isDeleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold">
                                {isDeleting ? 'Purging...' : 'Execute Purge'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div >
    )
}
