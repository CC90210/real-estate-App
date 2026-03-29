'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { ArrowLeft, Printer, PenLine, Check, FileSignature, ShieldCheck, Mail, User, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

// ============================================================================
// PRODUCTION DOCUMENT VIEWER - Renders structured template data
// Supports: property_summary, lease_proposal, showing_sheet, application_summary
// ============================================================================

export default function DocumentViewPage() {
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()
    const id = params?.id as string

    const { data: document, isLoading, error } = useQuery({
        queryKey: ['document', id],
        queryFn: async () => {
            // Stage 1: Primary Fetch
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('id', id)
                .maybeSingle()

            if (error) throw error
            if (!data) return null

            // Stage 2: Verification of Content Structure
            // Ensure content is parsed if it's stored as a string
            let parsedContent = data.content;
            try {
                if (typeof data.content === 'string') {
                    parsedContent = JSON.parse(data.content);
                }
            } catch (e) {
                console.error("Document content parse error:", e);
            }

            return {
                ...data,
                content: parsedContent
            }
        }
    })

    const [isSigning, setIsSigning] = useState(false)
    const [showRecipientDialog, setShowRecipientDialog] = useState(false)
    const [recipientEmail, setRecipientEmail] = useState('')
    const [recipientName, setRecipientName] = useState('')

    const handlePrint = () => window.print()

    // Opens the recipient capture dialog instead of firing immediately.
    const handleSendForSignatureClick = () => {
        // Pre-populate from document metadata if available (e.g. applicant email stored in content)
        const meta = document?.content
        const emailFromMeta: string =
            meta?.recipient_email ||
            meta?.content?.recipient_email ||
            meta?.applicant_email ||
            ''
        const nameFromMeta: string =
            meta?.recipient_name ||
            meta?.content?.recipient_name ||
            meta?.applicant_name ||
            ''
        setRecipientEmail(emailFromMeta)
        setRecipientName(nameFromMeta)
        setShowRecipientDialog(true)
    }

    const handleSignatureRequest = async () => {
        if (!document) return

        const trimmedEmail = recipientEmail.trim()
        if (!trimmedEmail) {
            toast.error('Recipient email is required')
            return
        }

        setShowRecipientDialog(false)
        setIsSigning(true)

        try {
            toast.info('Dispatching signature request...', { duration: 1500 })
            const response = await fetch('/api/documents/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    documentId: id,
                    recipientEmail: trimmedEmail,
                    recipientName: recipientName.trim() || null,
                    selectedDocuments: ['lease_agreement'],
                    eSignEnabled: true,
                    eSignProvider: 'propflow',
                    requireCounterSign: true,
                }),
            })

            const result = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(result?.details?.[0]?.message || result?.error || 'Signature dispatch failed')
            }


            // 3. Trigger Automation — recipient_email sourced from the dialog input

            toast.success('Signature Request Sent', {
                description: result?.message || 'All parties have been notified via secure email.',
                icon: <FileSignature className="w-4 h-4 text-emerald-500" />
            })

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            toast.error('Signature Dispatch Failed', { description: message })
        } finally {
            setIsSigning(false)
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

    if (error || !document) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Document Not Found</h2>
                <p className="text-slate-500 mb-6">The document you are looking for does not exist or you do not have permission.</p>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        )
    }

    const docContent = document.content?.content || document.content;
    const company = document.content?.company;
    const sections = docContent?.sections || [];
    const companyName = company?.name || 'Document';
    const needsSignature = ['lease_proposal', 'application_summary'].includes(document.type);

    return (
        <>
            {/* Global Print Styles - Hides ALL navigation/sidebar */}
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        padding: 20mm !important;
                        margin: 0 !important;
                    }
                    body > div > aside,
                    body > div > nav,
                    nav,
                    aside,
                    [data-sidebar],
                    .sidebar,
                    header:not(.print-header),
                    footer:not(.print-footer) {
                        display: none !important;
                    }
                    .print-container {
                        margin: 0 !important;
                        padding: 0 !important;
                        max-width: 100% !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
            `}</style>

            <div className="min-h-screen bg-slate-100/50 pb-20 print:pb-0 print:bg-white print:min-h-0">
                {/* Toolbar - Hidden when printing */}
                <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-50 print:hidden mb-4 md:mb-8 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                        <Button variant="ghost" size="sm" onClick={() => router.push('/documents')} className="shrink-0">
                            <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
                            <span className="hidden sm:inline">Back to Documents</span>
                            <span className="sm:hidden">Back</span>
                        </Button>
                        <div className="flex items-center gap-2 shrink-0">
                            {needsSignature && (
                                <Button
                                    onClick={handleSendForSignatureClick}
                                    disabled={isSigning}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100 text-xs md:text-sm"
                                >
                                    {isSigning ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileSignature className="w-4 h-4 mr-1" />}
                                    <span className="hidden sm:inline">{isSigning ? 'Preparing...' : 'Send for Signature'}</span>
                                    <span className="sm:hidden">{isSigning ? '...' : 'Sign'}</span>
                                </Button>
                            )}
                            <Button onClick={handlePrint} variant="outline" size="sm" className="border-2 text-xs md:text-sm">
                                <Printer className="w-4 h-4 mr-1" />
                                <span className="hidden sm:inline">Print / Save PDF</span>
                                <span className="sm:hidden">Print</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Document Paper */}
                <div id="document-paper" className="print-container max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:max-w-none min-h-[297mm] p-6 md:p-[20mm] text-slate-900 leading-relaxed text-sm">

                    {/* BRANDED DOCUMENT HEADER */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8 md:mb-10 pb-6 md:pb-8 border-b-2 border-slate-900">
                        <div className="flex items-center gap-4 md:gap-6 min-w-0">
                            {company?.logo_url && (
                                <img src={company.logo_url} alt="Company Logo" className="h-12 md:h-16 w-auto object-contain shrink-0" />
                            )}
                            <div className="min-w-0">
                                <h1 className="text-lg md:text-2xl font-black tracking-tight text-slate-900 uppercase break-words">
                                    {company?.name || 'Verified Record'}
                                </h1>
                                {company?.address && (
                                    <p className="text-xs md:text-sm text-slate-500 mt-1 break-words">{company.address}</p>
                                )}
                                <div className="flex flex-wrap gap-2 md:gap-4 text-xs text-slate-400 mt-1">
                                    {company?.phone && <span>{company.phone}</span>}
                                    {company?.email && <span className="break-all">{company.email}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="sm:text-right shrink-0">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Document Type</p>
                            <p className="text-base md:text-lg font-black text-slate-900 capitalize">{document.type?.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-slate-400 mt-2">
                                Generated: {format(new Date(document.created_at), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    </div>

                    {/* DOCUMENT TITLE */}
                    <div className="mb-8 md:mb-10">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight break-words">{document.title}</h2>
                    </div>

                    {sections.map((section: any, index: number) => (
                        <RenderSection key={index} section={section} company={company} />
                    ))}

                    {/* Fallback if no sections */}
                    {sections.length === 0 && (
                        <div className="text-center py-20">
                            <p className="text-slate-500">Document content is being prepared...</p>
                        </div>
                    )}

                    {/* PROFESSIONAL FOOTER - No website URL */}
                    <div className="print-footer mt-auto pt-8 md:pt-10 border-t border-slate-200">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs text-slate-400">
                            <div className="flex items-center gap-4">
                                {company?.logo_url && (
                                    <img src={company.logo_url} alt={`${company.name || 'Company'} logo`} className="h-6 w-auto opacity-50" />
                                )}
                                <span className="font-medium">{company?.name || 'Verified Record'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[8px] font-black uppercase tracking-widest opacity-20">Managed via PropFlow</span>
                                <span className="uppercase tracking-widest text-[10px]">
                                    Confidential • {format(new Date(document.created_at), 'yyyy')}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* SIGNATURE MODULE - Added per user request */}
                    {needsSignature && (
                        <div className="mt-20 pt-10 border-t-2 border-slate-100">
                            <div className="flex items-center gap-2 mb-10">
                                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Execution & Compliance</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-20">
                                <div className="space-y-6">
                                    <div className="h-16 border-b-2 border-slate-200 relative">
                                        <div className="absolute -bottom-6 left-0 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            Authorized Representative Signature
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                        <span>Title: ____________________</span>
                                        <span>Date: ____________________</span>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="h-16 border-b-2 border-slate-200 relative">
                                        <div className="absolute -bottom-6 left-0 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            Lessor / Authorized Agent Signature
                                        </div>
                                        <div className="absolute bottom-2 left-2 text-slate-200 font-mono text-xs italic opacity-50 select-none">
                                            Digitally Verified by PropFlow
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                        <span>Title: Broker / Agent</span>
                                        <span>Date: {format(new Date(), 'MMM dd, yyyy')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-16 p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                        <PenLine className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-none mb-1">E-Signature Authorization</p>
                                        <p className="text-[10px] text-slate-400 font-bold">Document ID: {id.toUpperCase()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Secure Audit Log Enabled</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recipient capture dialog — shown before triggering signature automation */}
            <Dialog open={showRecipientDialog} onOpenChange={setShowRecipientDialog}>
                <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden border-slate-100/50 bg-white shadow-2xl gap-0">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                                <FileSignature className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-black text-slate-900">
                                    Send for Signature
                                </DialogTitle>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    Enter the recipient&apos;s details
                                </p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="px-6 py-5 space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Full Name (optional)
                            </label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Recipient full name"
                                    value={recipientName}
                                    onChange={e => setRecipientName(e.target.value)}
                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="email"
                                    placeholder="recipient@example.com"
                                    value={recipientEmail}
                                    onChange={e => setRecipientEmail(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && recipientEmail.trim()) handleSignatureRequest()
                                    }}
                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    autoFocus
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-end gap-2 w-full">
                            <Button
                                variant="outline"
                                onClick={() => setShowRecipientDialog(false)}
                                className="rounded-xl h-10 font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSignatureRequest}
                                disabled={!recipientEmail.trim()}
                                className="rounded-xl h-10 bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-200 border-0"
                            >
                                <FileSignature className="h-4 w-4 mr-2" />
                                Send
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

// ============================================================================
// SECTION RENDERER - Renders each template section type
// ============================================================================

function RenderSection({ section, company }: { section: any; company: any }) {
    switch (section.type) {
        // Header is now rendered by the document viewer's branded header - skip duplicate
        case 'header':
            return null;

        case 'hero':
            return (
                <div className="mb-10">
                    <h2 className="text-3xl font-black text-slate-900 mb-2">{section.content.address}</h2>
                    {section.content.unit && <p className="text-lg text-slate-600 font-medium">Unit {section.content.unit}</p>}
                    <div className="flex gap-6 mt-4 text-lg">
                        <span className="font-bold text-blue-600">{section.content.rent}</span>
                        <span className="text-slate-500">{section.content.specs}</span>
                    </div>
                </div>
            );

        case 'highlights':
            return (
                <div className="mb-8">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">{section.title}</h3>
                    <ul className="space-y-2">
                        {section.items?.map((item: string, i: number) => (
                            <li key={i} className="text-slate-700 pl-4 border-l-2 border-blue-500">{item}</li>
                        ))}
                    </ul>
                </div>
            );

        case 'cta':
            return (
                <div className="my-8 p-6 bg-blue-50 rounded-lg border border-blue-100 text-center">
                    <p className="text-lg font-semibold text-blue-800">{section.content}</p>
                </div>
            );

        case 'intro':
            return (
                <div className="mb-8 text-base leading-relaxed text-slate-700">
                    <p>{section.content}</p>
                </div>
            );

        case 'terms':
            return (
                <div className="mb-8 bg-slate-50 border border-slate-100 rounded-xl p-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-6">{section.title}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {section.items?.map((item: any, i: number) => (
                            <div key={i} className="py-2 border-b border-slate-100 last:border-none">
                                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">{item.label}</p>
                                <p className="text-lg font-bold text-slate-900">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'conditions':
            return (
                <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">{section.title}</h3>
                    <div className="bg-white border-l-4 border-slate-300 pl-4 py-2 text-slate-600 italic">
                        {section.content}
                    </div>
                </div>
            );

        case 'signatures':
            return <SignatureSection section={section} />;


        case 'property_details':
        case 'applicant_profile':
        case 'financials':
            return (
                <div className="mb-8">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-4">{section.title}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        {section.items?.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between">
                                <span className="text-slate-500">{item.label}</span>
                                <span className={`font-medium ${item.status === 'PASS' ? 'text-green-600' : item.status === 'FAIL' ? 'text-red-600' : 'text-slate-900'}`}>
                                    {item.value} {item.status && <span className="ml-1 text-xs">({item.status})</span>}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'talking_points':
            return (
                <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-4">{section.title}</h3>
                    <ul className="space-y-2 text-slate-800 font-medium">
                        {section.items?.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>
                </div>
            );

        case 'access':
            return (
                <div className="mt-8 p-6 bg-amber-50 rounded-lg border border-amber-100 text-amber-900">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">{section.title}</h3>
                    <p className="font-mono text-sm">{section.content}</p>
                </div>
            );

        case 'recommendation':
            const statusColor = section.status?.includes('Approve') ? 'bg-emerald-50 border-emerald-500 text-emerald-800' :
                section.status?.includes('Deny') ? 'bg-red-50 border-red-500 text-red-800' :
                    'bg-amber-50 border-amber-500 text-amber-800';
            return (
                <div className={`p-6 rounded-lg border-l-4 mb-8 ${statusColor}`}>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Recommendation</p>
                    <p className="text-2xl font-bold">{section.status}</p>
                    <p className="mt-2 text-sm opacity-80">{section.content}</p>
                </div>
            );

        case 'risk_assessment':
            return (
                <div className="mb-8">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-4">{section.title}</h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-slate-500 uppercase">Risk Factors</p>
                            <p className="text-sm text-slate-700">{section.riskFactors}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase">Agent Notes</p>
                            <p className="text-sm text-slate-700 italic">{section.agentNotes}</p>
                        </div>
                    </div>
                </div>
            );

        // Footer is now rendered by the document viewer's branded footer - skip duplicate
        case 'footer':
            return null;

        default:
            return null;
    }
}

// ============================================================================
// INTERACTIVE SIGNATURE SECTION
// ============================================================================

function SignatureSection({ section }: { section: any }) {
    const [signatures, setSignatures] = useState<Record<number, { name: string; date: string } | null>>({});
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [inputValue, setInputValue] = useState('');

    const handleSign = (index: number) => {
        if (signatures[index]) return; // Already signed
        setEditingIndex(index);
        setInputValue('');
    };

    const confirmSignature = (index: number) => {
        if (inputValue.trim()) {
            setSignatures(prev => ({
                ...prev,
                [index]: {
                    name: inputValue.trim(),
                    date: format(new Date(), 'MMM dd, yyyy')
                }
            }));
        }
        setEditingIndex(null);
        setInputValue('');
    };

    const cancelSignature = () => {
        setEditingIndex(null);
        setInputValue('');
    };

    return (
        <div className="mt-16 pt-8 border-t-2 border-slate-900">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-8">
                Agreement & Signatures
            </h3>
            <div className="grid grid-cols-3 gap-8">
                {section.fields?.map((field: string, i: number) => (
                    <div key={i} className="space-y-3">
                        {signatures[i] ? (
                            // Signed state
                            <div className="space-y-2">
                                <div className="h-20 flex items-end pb-2">
                                    <p className="text-2xl font-serif italic text-slate-900">
                                        {signatures[i]?.name}
                                    </p>
                                </div>
                                <div className="border-t border-slate-300 pt-2 flex items-center gap-2">
                                    <Check className="w-3 h-3 text-green-600" />
                                    <span className="text-xs text-slate-500">{field}</span>
                                </div>
                                {field.toLowerCase().includes('date') && (
                                    <p className="text-sm text-slate-600">{signatures[i]?.date}</p>
                                )}
                            </div>
                        ) : editingIndex === i ? (
                            // Editing state
                            <div className="space-y-2">
                                <div className="h-20 flex items-end">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') confirmSignature(i);
                                            if (e.key === 'Escape') cancelSignature();
                                        }}
                                        placeholder="Type your full name..."
                                        className="w-full text-xl font-serif italic border-b-2 border-blue-500 bg-transparent outline-none pb-1 text-slate-900 placeholder:text-slate-300"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => confirmSignature(i)}
                                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        onClick={cancelSignature}
                                        className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium hover:bg-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <p className="text-xs uppercase tracking-wider text-slate-400">{field}</p>
                            </div>
                        ) : (
                            // Empty state - click to sign
                            <div
                                onClick={() => handleSign(i)}
                                className="cursor-pointer group"
                            >
                                <div className="h-20 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:bg-blue-50/50 transition-all print:border-transparent print:bg-transparent">
                                    <PenLine className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors print:hidden" />
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 group-hover:text-blue-600 transition-colors print:hidden">
                                        Click to sign
                                    </span>
                                </div>
                                <div className="border-t border-slate-300 pt-2 mt-2">
                                    <p className="text-xs uppercase tracking-wider text-slate-400">{field}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <p className="text-[10px] text-slate-400 italic mt-8 print:hidden">
                By signing above, all parties acknowledge and agree to the terms outlined in this document.
            </p>
        </div>
    );
}
