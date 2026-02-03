'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Printer } from 'lucide-react'
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
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            return data
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

                    {sections.map((section: any, index: number) => (
                        <RenderSection key={index} section={section} company={company} />
                    ))}

                    {/* Fallback if no sections */}
                    {sections.length === 0 && (
                        <div className="text-center py-20">
                            <p className="text-slate-500">Document content is being prepared...</p>
                        </div>
                    )}

                    {/* Footer Watermark - Uses actual company name */}
                    <div className="print-footer mt-20 pt-8 border-t border-slate-100 text-center text-[10px] text-slate-400 uppercase tracking-widest print:mt-auto">
                        Generated by {companyName} &bull; Confidential &bull; {new Date().getFullYear()}
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
        case 'header':
            return (
                <div className="flex justify-between items-start mb-12 border-b border-slate-900/10 pb-8">
                    <div>
                        {section.content.companyLogo && (
                            <img src={section.content.companyLogo} alt="Logo" className="h-12 mb-3" />
                        )}
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">{section.content.companyName}</h1>
                    </div>
                    <div className="text-right text-xs text-slate-400 space-y-1">
                        <p>{section.content.documentDate}</p>
                    </div>
                </div>
            );

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
            return (
                <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between gap-12">
                    {section.fields?.map((field: string, i: number) => (
                        <div key={i} className="flex-1 space-y-12">
                            <div className="border-b border-slate-300 h-px w-full" />
                            <p className="text-xs uppercase tracking-wider text-slate-400">{field}</p>
                        </div>
                    ))}
                </div>
            );

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

        case 'footer':
            return (
                <div className="mt-12 pt-6 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
                    <p>{section.content.companyName}</p>
                    <p>{section.content.phone} | {section.content.email}</p>
                </div>
            );

        default:
            return null;
    }
}
