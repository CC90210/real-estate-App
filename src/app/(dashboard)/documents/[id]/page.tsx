'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Printer, PenLine, Check } from 'lucide-react'
import { format } from 'date-fns'

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
                .single()

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

    const handlePrint = () => window.print()

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

    return (
        <>
            {/* Global Print Styles - Hides ALL navigation/sidebar */}
            <style jsx global>{`
                @media print {
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
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .print-container {
                        margin: 0 !important;
                        padding: 0 !important;
                        max-width: 100% !important;
                    }
                }
            `}</style>

            <div className="min-h-screen bg-slate-100/50 pb-20 print:pb-0 print:bg-white print:min-h-0">
                {/* Toolbar - Hidden when printing */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 print:hidden mb-8 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.push('/documents')}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Documents
                        </Button>
                        <div className="h-6 w-px bg-slate-200" />
                        <h1 className="font-semibold text-slate-700">{document.title}</h1>
                    </div>
                    <Button onClick={handlePrint} className="bg-slate-900 text-white hover:bg-slate-800">
                        <Printer className="w-4 h-4 mr-2" />
                        Print / Save PDF
                    </Button>
                </div>

                {/* Document Paper */}
                <div className="print-container max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:max-w-none min-h-[297mm] p-[20mm] text-slate-900 leading-relaxed text-sm">

                    {/* BRANDED DOCUMENT HEADER */}
                    <div className="flex justify-between items-start mb-10 pb-8 border-b-2 border-slate-900">
                        <div className="flex items-center gap-6">
                            {company?.logo_url && (
                                <img src={company.logo_url} alt="Company Logo" className="h-16 w-auto object-contain" />
                            )}
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                                    {company?.name || 'PropFlow Document'}
                                </h1>
                                {company?.address && (
                                    <p className="text-sm text-slate-500 mt-1">{company.address}</p>
                                )}
                                <div className="flex gap-4 text-xs text-slate-400 mt-1">
                                    {company?.phone && <span>{company.phone}</span>}
                                    {company?.email && <span>{company.email}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Document Type</p>
                            <p className="text-lg font-black text-slate-900 capitalize">{document.type?.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-slate-400 mt-2">
                                Generated: {format(new Date(document.created_at), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    </div>

                    {/* DOCUMENT TITLE */}
                    <div className="mb-10">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{document.title}</h2>
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
                    <div className="print-footer mt-auto pt-10 border-t border-slate-200">
                        <div className="flex justify-between items-center text-xs text-slate-400">
                            <div className="flex items-center gap-4">
                                {company?.logo_url && (
                                    <img src={company.logo_url} alt="" className="h-6 w-auto opacity-50" />
                                )}
                                <span className="font-medium">{company?.name || 'PropFlow'}</span>
                            </div>
                            <div className="text-right">
                                <span className="uppercase tracking-widest text-[10px]">
                                    Confidential • {format(new Date(document.created_at), 'yyyy')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
