'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    ArrowLeft, Printer, DollarSign, CheckCircle, Clock, XCircle,
    Send, Trash2, Edit3, Mail, AlertCircle, Info, ShieldCheck, Zap, Loader2
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
    const { items, company, property, currentStatus, StatusIcon } = useMemo(() => {
        const statusConfig: Record<string, { label: string; color: string; icon: any; banner?: string }> = {
            draft: {
                label: 'Verified Entry',
                color: 'bg-slate-100 text-slate-800',
                icon: Clock
            },
            sent: {
                label: 'Dispatched',
                color: 'bg-indigo-100 text-indigo-700 font-bold',
                icon: Send
            },
            paid: {
                label: 'Settled & Paid',
                color: 'bg-emerald-100 text-emerald-800 font-black tracking-tight',
                icon: ShieldCheck,
                banner: 'This transaction has been fully verified, settled, and logged in the revenue ledger.'
            },
            overdue: {
                label: 'Action Required',
                color: 'bg-rose-100 text-rose-800 animate-pulse',
                icon: AlertCircle,
                banner: 'Payment is past due. Procurement intervention or automated follow-up is recommended.'
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

    const handleDispatch = async (skipPdf = false) => {
        if (!invoice || !id) return;
        setIsUpdating(true)
        try {
            let fileUrl = "";

            if (!skipPdf) {
                // 1. Generate PDF Blob via Isolated Sandbox
                toast.message('Generating Document', { description: 'Isolating capture in secure sandbox...' })
                await new Promise(r => setTimeout(r, 800)); // UI Settle

                try {
                    const pdfBlob = await generatePDFBlob('invoice-paper');
                    if (pdfBlob) {
                        toast.message('Secure Upload', { description: 'Transmitting PDF to document vault...' })
                        const path = `${invoice.company_id}/invoice_${id}_${Date.now()}.pdf`;
                        fileUrl = await uploadAndGetLink(pdfBlob, path);
                    }
                } catch (pdfError) {
                    console.error("PDF Capture Failed:", pdfError);
                    toast.error('Document Capture Failed', {
                        description: 'Generating metadata-only dispatch to avoid delay...',
                        duration: 4000
                    });
                }
            }

            // 2. Trigger Automation (Propagate Data)
            toast.message('Propagating Webhook', { description: 'Broadcasting data to intelligent gateway...' })
            await triggerInvoiceAutomation({
                invoice_id: id as string,
                invoice_number: invoice.invoice_number,
                recipient_name: invoice.recipient_name,
                recipient_email: invoice.recipient_email,
                amount: invoice.total,
                company_id: invoice.company_id,
                created_by: invoice.created_by,
                items: items, // Future-proof: full itemized data
                file_url: fileUrl || "DATA_ONLY_DISPATCH",
                triggered_at: new Date().toISOString()
            });

            // 3. Update Status Locally
            const { error } = await supabase
                .from('invoices')
                .update({
                    status: 'sent',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error

            queryClient.invalidateQueries({ queryKey: ['invoice', id] })
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
            toast.success('Propagation Successful', {
                description: fileUrl ? 'Document and metadata dispatched.' : 'Metadata dispatched successfully (Data-Only Mode).'
            })
            await refetch()

        } catch (e: any) {
            console.error(e)
            toast.error('Transmission Failure', {
                description: e.message,
                duration: 6000
            })
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
            <div className="bg-white/90 backdrop-blur-2xl border-b border-slate-100 px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row md:items-center justify-between sticky top-0 z-50 no-print shadow-xl shadow-slate-200/10 gap-4 md:gap-0">
                <div className="flex items-center justify-between md:justify-start gap-4">
                    <div className="flex items-center gap-2 md:gap-4">
                        <Button variant="ghost" onClick={() => router.push('/invoices')} className="h-9 md:h-10 px-2 md:px-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100">
                            <ArrowLeft className="w-4 h-4 md:mr-2" />
                            <span className="hidden md:inline">Invoices</span>
                        </Button>
                        <div className="h-6 w-px bg-slate-200 hidden md:block" />
                        <div className="flex flex-col">
                            <h1 className="font-black text-slate-900 text-[10px] md:text-xs tracking-tight leading-none flex items-center gap-1.5 line-clamp-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                Ledger <span className="hidden sm:inline">Entry</span> #{invoice.invoice_number}
                            </h1>
                        </div>
                    </div>

                    <div className={`flex md:hidden items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${currentStatus.color} ${invoice.status === 'draft' ? 'hidden' : ''}`}>
                        <StatusIcon className="w-3 h-3" />
                        {invoice.status}
                    </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                    <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${currentStatus.color} ${invoice.status === 'draft' ? 'hidden' : ''}`}>
                        <StatusIcon className="w-3 h-3" />
                        {currentStatus.label}
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block" />

                    <div className="flex gap-1.5 whitespace-nowrap">
                        {/* Always show Paid option if not paid already */}
                        {invoice.status !== 'paid' && (
                            <Button
                                onClick={() => updateStatus('paid')}
                                disabled={isUpdating}
                                className="h-9 md:h-10 px-3 md:px-4 rounded-xl font-black uppercase text-[9px] tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5"
                            >
                                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                <span className="hidden sm:inline">Mark as Paid</span>
                                <span className="sm:hidden">Pay</span>
                            </Button>
                        )}

                        {invoice.status === 'draft' && (
                            <>
                                <Button
                                    onClick={() => handleDispatch(false)}
                                    disabled={isUpdating}
                                    className="h-9 md:h-10 px-3 md:px-4 rounded-xl font-black uppercase text-[9px] tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
                                >
                                    {isUpdating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                                    <span className="hidden sm:inline">Dispatch Entry</span>
                                    <span className="sm:hidden">Send</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => handleDispatch(true)}
                                    disabled={isUpdating}
                                    className="h-9 md:h-10 px-3 md:px-4 rounded-xl font-black uppercase text-[9px] tracking-widest border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                                    title="Send metadata only without generating PDF"
                                >
                                    <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                                    <span className="hidden lg:inline">Data Only</span>
                                </Button>
                            </>
                        )}

                        <Button variant="outline" onClick={() => router.push(`/invoices/${id}/edit`)} className="h-9 md:h-10 px-3 md:px-4 rounded-xl font-black uppercase text-[9px] tracking-widest border-2">
                            <Edit3 className="w-3.5 h-3.5 md:mr-1.5" />
                            <span className="hidden sm:inline">Edit</span>
                        </Button>

                        <Button onClick={handlePrint} className="h-9 md:h-10 px-3 md:px-4 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg">
                            <Printer className="w-3.5 h-3.5 md:mr-1.5" />
                            <span className="hidden sm:inline">Print / PDF</span>
                            <span className="sm:hidden">Print</span>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-[850px] mx-auto pt-6 md:pt-8 px-4 md:px-6 no-print">
                {currentStatus.banner && (
                    <Alert className="mb-6 rounded-2xl border bg-white shadow-lg shadow-slate-100 animate-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                {invoice.status === 'paid' ? <ShieldCheck className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                            </div>
                            <div>
                                <AlertTitle className="font-black uppercase tracking-widest text-[9px] mb-0.5 opacity-50">Status Bulletin</AlertTitle>
                                <AlertDescription className="text-slate-600 font-bold text-xs leading-tight">
                                    {currentStatus.banner}
                                </AlertDescription>
                            </div>
                        </div>
                    </Alert>
                )}
            </div>

            {/* MAIN INVOICE PAPER */}
            <div className="px-4 md:px-6 mb-20 md:mb-0 overflow-x-auto md:overflow-visible scrollbar-hide">
                <div id="invoice-paper" className="print-container w-full max-w-[850px] mx-auto bg-white shadow-[0_20px_50px_-10px_rgba(0,0,0,0.03)] print:shadow-none min-h-[11in] p-6 md:p-12 rounded-3xl md:rounded-[2.5rem] text-slate-900 leading-relaxed text-xs animate-in zoom-in-95 duration-700 mb-10">

                    {/* BRAND HEADER */}
                    <div className="flex flex-col md:flex-row justify-between items-start mb-8 md:mb-16 border-b-4 border-slate-900 pb-8 md:pb-10 gap-8">
                        <div className="flex gap-4 md:gap-6">
                            {company?.logo_url ? (
                                <img src={company.logo_url} alt="Logo" className="h-10 md:h-12 w-auto object-contain" />
                            ) : (
                                <div className="h-10 w-10 md:h-12 md:w-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shrink-0">
                                    <DollarSign className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-lg md:text-xl font-black tracking-tight text-slate-900 uppercase leading-none mb-2">{company?.name || 'Verified Invoice'}</h1>
                                <div className="space-y-0.5 text-[9px] md:text-[10px] text-slate-500 font-bold">
                                    <p>{company?.address || 'Corporate Headquarters'}</p>
                                    <p>{company?.phone} &bull; {company?.email}</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-left md:text-right w-full md:w-auto">
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter mb-2">INVOICE</h2>
                            <div className="inline-block bg-slate-900 px-4 py-2 rounded-xl">
                                <p className="font-mono font-black text-white text-sm md:text-base tracking-widest">#{invoice.invoice_number}</p>
                            </div>
                            <div className="mt-4 md:mt-6 space-y-1 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400">
                                <p>Issued: <span className="text-slate-900">{safeFormat(invoice.issue_date || invoice.created_at, 'MMM dd, yyyy')}</span></p>
                                <p>Due: <span className="text-slate-900">{safeFormat(invoice.due_date, 'MMM dd, yyyy') || 'Upon Receipt'}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* DETAILS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 mb-10 md:mb-16">
                        <div className="p-6 md:p-8 bg-slate-50/50 rounded-3xl border border-slate-100">
                            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Recipient Information</h3>
                            <p className="text-lg md:text-xl font-black text-slate-900 tracking-tight mb-0.5">{invoice.recipient_name}</p>
                            <p className="text-slate-500 font-bold uppercase text-[8px] md:text-[9px] tracking-widest mb-4 md:mb-6">{invoice.recipient_email}</p>

                            {property && (
                                <div className="pt-4 border-t border-slate-200/50">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Linked Asset</p>
                                    <p className="text-slate-900 font-black text-xs md:text-sm uppercase tracking-tight line-clamp-1">
                                        {property.address}
                                        {property.unit_number && <span className="ml-2 py-0.5 px-2 bg-slate-900 text-white rounded-md text-[8px]">UNIT {property.unit_number}</span>}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col justify-center items-start md:items-end md:text-right md:pr-4">
                            <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Amount Due</h3>
                            <p className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter mb-4">{getCurrencySymbol(invoice.currency)}{Number(invoice.total || 0).toLocaleString()}</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${invoice.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <p className={`text-[9px] font-black uppercase tracking-widest ${invoice.status === 'paid' ? 'text-emerald-600' : 'text-amber-500'}`}>
                                    {invoice.status === 'paid' ? 'Ledger Verified' : 'Payment Awaited'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* LINE ITEMS TABLE */}
                    <div className="mb-8 md:mb-12 overflow-x-auto rounded-3xl border border-slate-100 shadow-sm scrollbar-hide">
                        <table className="w-full text-[10px] md:text-[11px] min-w-[600px] md:min-w-0">
                            <thead>
                                <tr className="bg-slate-900 text-white">
                                    <th className="text-left p-4 md:p-5 font-black uppercase text-[8px] md:text-[9px] tracking-widest">Service Description</th>
                                    <th className="text-center p-4 md:p-5 font-black uppercase text-[8px] md:text-[9px] tracking-widest">Qty</th>
                                    <th className="text-right p-4 md:p-5 font-black uppercase text-[8px] md:text-[9px] tracking-widest">Rate</th>
                                    <th className="text-right p-4 md:p-5 font-black uppercase text-[8px] md:text-[9px] tracking-widest">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item: any, index: number) => (
                                    <tr key={index} className="hover:bg-slate-50/50">
                                        <td className="p-4 md:p-5">
                                            <p className="font-black text-slate-900 uppercase tracking-tight text-xs md:text-sm">{item.description || 'Professional Real Estate Service'}</p>
                                            <p className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Reference: TRX-{index + 101}</p>
                                        </td>
                                        <td className="p-4 md:p-5 text-center font-bold text-slate-600">{item.quantity || 1}</td>
                                        <td className="p-4 md:p-5 text-right font-bold text-slate-600">{getCurrencySymbol(invoice.currency)}{Number(item.amount || 0).toLocaleString()}</td>
                                        <td className="p-4 md:p-5 text-right font-black text-slate-900 text-sm md:text-base">{getCurrencySymbol(invoice.currency)}{(Number(item.amount || 0) * (item.quantity || 1)).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-50/50 font-black text-slate-900">
                                    <td colSpan={3} className="p-4 md:p-5 text-right uppercase text-[8px] md:text-[9px] tracking-widest text-slate-400">Transaction Subtotal</td>
                                    <td className="p-4 md:p-5 text-right text-base md:text-lg tracking-tighter">{getCurrencySymbol(invoice.currency)}{Number(invoice.total || 0).toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                        <div className="space-y-4">
                            <div className="p-5 md:p-6 rounded-2xl bg-slate-50 border border-slate-100 italic text-slate-500 text-[9px] md:text-[10px] font-medium leading-relaxed">
                                <h4 className="font-black uppercase tracking-widest text-slate-400 text-[8px] mb-2 not-italic">Notes & Compliance</h4>
                                {invoice.notes || 'This invoice is a digitally verified ledger entry. Please settle the balance as per the agreed terms of service.'}
                            </div>
                        </div>
                        <div className="flex flex-col justify-end">
                            <div className="border-t-2 border-slate-900 pt-6 flex justify-between items-baseline">
                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Total Settlement Ammount</span>
                                <span className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900">{getCurrencySymbol(invoice.currency)}{Number(invoice.total || 0).toLocaleString()}</span>
                            </div>
                            <p className="text-[8px] text-slate-400 text-right uppercase tracking-widest font-black mt-2">All prices in {invoice.currency || 'USD'}</p>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="mt-12 md:mt-16 pt-6 md:pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-[8px] font-black uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span>Corporate Ledger &copy; {new Date().getFullYear()}</span>
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-end gap-3 md:gap-4 items-center">
                            <span className="opacity-30">Securely processed via PropFlow</span>
                            <div className="w-0.5 h-0.5 rounded-full bg-slate-200 hidden md:block" />
                            <span>Digital Signature: {id.slice(0, 12).toUpperCase()}</span>
                            <div className="w-0.5 h-0.5 rounded-full bg-slate-200 hidden md:block" />
                            <span>Page 01 / 01</span>
                        </div>
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
                    <DialogContent className="rounded-3xl md:rounded-[2rem] w-[calc(100%-2rem)] max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black tracking-tight">Purge Ledger Entry</DialogTitle>
                            <DialogDescription className="font-medium text-xs">
                                Are you absolutely sure you want to delete this invoice? This action is permanent and cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 mt-4">
                            <DialogClose asChild>
                                <Button variant="ghost" className="h-12 rounded-xl font-bold flex-1 md:flex-none">Cancel</Button>
                            </DialogClose>
                            <Button onClick={deleteInvoice} disabled={isDeleting} className="h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex-1 md:flex-none">
                                {isDeleting ? 'Purging...' : 'Execute Purge'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>

    )
}
