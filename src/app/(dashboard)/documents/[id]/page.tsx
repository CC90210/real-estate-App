'use client'

import { useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Printer, Download, Share2 } from 'lucide-react'
import { format } from 'date-fns'

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
                .select('*, company:companies(*)')
                .eq('id', id)
                .single()

            if (error) throw error
            return data
        }
    })

    const handlePrint = () => {
        window.print()
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
                <p className="text-slate-500 mb-6">The document you are looking for does not exist or you do not have permission to view it.</p>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        )
    }

    const { content } = document
    const { property, application, aiHighlight, aiIntro, aiTalkingPoints, aiAnalysis } = content

    return (
        <div className="min-h-screen bg-slate-100/50 pb-20 print:pb-0 print:bg-white">
            {/* Toolbar - Hidden when printing */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 print:hidden mb-8 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-6 w-px bg-slate-200" />
                    <h1 className="font-semibold text-slate-700">{document.title}</h1>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handlePrint} className="bg-slate-900 text-white hover:bg-slate-800">
                        <Printer className="w-4 h-4 mr-2" />
                        Print / Save PDF
                    </Button>
                </div>
            </div>

            {/* Document Paper */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:max-w-none min-h-[297mm] p-[20mm] text-slate-900 leading-relaxed text-sm">

                {/* Header */}
                <div className="flex justify-between items-start mb-12 border-b border-slate-900/10 pb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2 uppercase">PropFlow Intelligence</h1>
                        <p className="text-slate-500 text-xs uppercase tracking-widest font-medium">Real Estate Documentation</p>
                    </div>
                    <div className="text-right text-xs text-slate-400 space-y-1">
                        <p>ID: {document.id.slice(0, 8).toUpperCase()}</p>
                        <p>Date: {format(new Date(document.created_at), 'MMM dd, yyyy')}</p>
                    </div>
                </div>

                {/* Content - Logic based on Type */}

                {/* ================= PROPERTY SUMMARY ================= */}
                {document.type === 'property_summary' && (
                    <div className="space-y-8">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2 block">Marketing Highlight</span>
                            <div className="text-xl font-serif text-slate-800 italic leading-relaxed border-l-4 border-blue-600 pl-6 py-2 bg-blue-50/50">
                                "{aiHighlight}"
                            </div>
                        </div>

                        {property && (
                            <div className="grid grid-cols-2 gap-8 mt-8">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Property Details</h3>
                                    <div className="grid grid-cols-2 gap-y-4 text-sm">
                                        <div>
                                            <p className="text-slate-500 text-xs">Address</p>
                                            <p className="font-medium">{property.address}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs">Unit</p>
                                            <p className="font-medium">{property.unit_number || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs">Rent</p>
                                            <p className="font-medium">${property.rent?.toLocaleString()}/mo</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs">Layout</p>
                                            <p className="font-medium">{property.bedrooms} Bed / {property.bathrooms} Bath</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Features</h3>
                                    <p className="text-sm text-slate-600 whitespace-pre-line">{property.description || 'No additional description provided.'}</p>
                                </div>
                            </div>
                        )}

                        {content.customFields?.targetAudience && (
                            <div className="mt-8 bg-slate-50 p-6 rounded-lg print:border print:border-slate-100">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Target Audience Strategy</h3>
                                <p className="text-sm">{content.customFields.targetAudience}</p>
                            </div>
                        )}
                    </div>
                )}


                {/* ================= LEASE PROPOSAL ================= */}
                {document.type === 'lease_proposal' && (
                    <div className="space-y-8">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Lease Proposal</h2>
                            <p className="text-slate-500">Prepared for {content.customFields?.tenantName}</p>
                        </div>

                        <div className="text-base leading-relaxed text-slate-700">
                            {aiIntro}
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 my-8 print:border-slate-200">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-6">Proposed Terms</h3>
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Monthly Rent</p>
                                    <p className="text-2xl font-bold text-slate-900">${content.customFields?.offerRent}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Lease Duration</p>
                                    <p className="text-2xl font-bold text-slate-900">{content.customFields?.leaseTerm} Months</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Property</p>
                                    <p className="text-lg font-medium text-slate-900">{property?.address} {property?.unit_number && `#${property.unit_number}`}</p>
                                </div>
                            </div>
                        </div>

                        {content.customFields?.conditions && (
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Special Conditions</h3>
                                <div className="bg-white border-l-4 border-slate-200 pl-4 py-2 text-slate-600 italic">
                                    {content.customFields.conditions}
                                </div>
                            </div>
                        )}

                        <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between gap-12">
                            <div className="flex-1 space-y-12">
                                <div className="border-b border-slate-300 h-px w-full" />
                                <p className="text-xs uppercase tracking-wider text-slate-400">Landlord Signature</p>
                            </div>
                            <div className="flex-1 space-y-12">
                                <div className="border-b border-slate-300 h-px w-full" />
                                <p className="text-xs uppercase tracking-wider text-slate-400">Tenant Signature</p>
                            </div>
                        </div>
                    </div>
                )}


                {/* ================= SHOWING SHEET ================= */}
                {document.type === 'showing_sheet' && (
                    <div className="space-y-8">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-slate-900 text-white px-4 py-2 text-sm font-bold uppercase tracking-widest">
                                Exclusive Showing
                            </div>
                            <h2 className="text-xl font-bold">{property?.address}</h2>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
                                <p className="text-2xl font-bold text-slate-900">{property?.bedrooms}</p>
                                <p className="text-[10px] uppercase tracking-widest text-slate-500">Bedrooms</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
                                <p className="text-2xl font-bold text-slate-900">{property?.bathrooms}</p>
                                <p className="text-[10px] uppercase tracking-widest text-slate-500">Bathrooms</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
                                <p className="text-2xl font-bold text-slate-900">${property?.rent?.toLocaleString()}</p>
                                <p className="text-[10px] uppercase tracking-widest text-slate-500">Monthly Rent</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-4 flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                Key Talking Points
                            </h3>
                            <div className="whitespace-pre-line text-lg text-slate-800 leading-relaxed font-medium">
                                {aiTalkingPoints}
                            </div>
                        </div>

                        {content.customFields?.accessNotes && (
                            <div className="mt-8 p-6 bg-amber-50 rounded-lg border border-amber-100 text-amber-900">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">Access Instructions (Private)</h3>
                                <p className="font-mono text-sm">{content.customFields.accessNotes}</p>
                            </div>
                        )}

                        {content.customFields?.notes && (
                            <div className="mt-8">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Internal Notes</h3>
                                <p className="text-sm text-slate-500 italic">{content.customFields.notes}</p>
                            </div>
                        )}
                    </div>
                )}


                {/* ================= APPLICATION SUMMARY ================= */}
                {document.type === 'application_summary' && (
                    <div className="space-y-8">
                        <div className={`p-6 rounded-lg border-l-4 ${content.customFields?.recommendation?.includes('Approve') ? 'bg-emerald-50 border-emerald-500' :
                                content.customFields?.recommendation?.includes('Deny') ? 'bg-red-50 border-red-500' :
                                    'bg-amber-50 border-amber-500'
                            }`}>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Recommendation</p>
                            <p className="text-2xl font-bold">{content.customFields?.recommendation || 'Pending Review'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-8 border-b border-slate-100 pb-8">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Applicant Profile</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-slate-500">Name</span>
                                        <span className="font-medium">{application?.applicant_name}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-slate-500">Credit Score</span>
                                        <span className="font-medium">{application?.credit_score}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-slate-500">Monthly Income</span>
                                        <span className="font-medium">${application?.monthly_income?.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Risk Analysis</h3>
                                <div className="text-sm leading-relaxed text-slate-700">
                                    {aiAnalysis}
                                </div>
                            </div>
                        </div>

                        {content.customFields?.riskFactors && (
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-2">Identified Risk Factors</h3>
                                <p className="text-sm text-slate-700">{content.customFields.riskFactors}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-20 pt-8 border-t border-slate-100 text-center text-[10px] text-slate-400 uppercase tracking-widest">
                    Generated by PropFlow Intelligence &bull; Confidential &bull; {new Date().getFullYear()}
                </div>
            </div>
        </div>
    )
}
