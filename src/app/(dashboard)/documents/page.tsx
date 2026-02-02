'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    FileText,
    ClipboardList,
    Home,
    Users,
    Download,
    Clock,
    ChevronRight,
    AlertTriangle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const documentTypes = [
    {
        id: 'showing_sheet',
        name: 'Showing Sheet',
        description: 'For agents - property showing details',
        icon: ClipboardList,
        color: 'bg-blue-100 text-blue-600'
    },
    {
        id: 'lease_proposal',
        name: 'Lease Proposal',
        description: 'For landlords - lease terms',
        icon: FileText,
        color: 'bg-green-100 text-green-600'
    },
    {
        id: 'application_summary',
        name: 'Application Summary',
        description: 'For landlords - applicant overview',
        icon: Users,
        color: 'bg-purple-100 text-purple-600'
    },
    {
        id: 'property_summary',
        name: 'Property Summary',
        description: 'Marketing - property details',
        icon: Home,
        color: 'bg-amber-100 text-amber-600'
    }
]

export default function DocumentsPage() {
    const router = useRouter()
    const supabase = createClient()
    const [selectedType, setSelectedType] = useState<string | null>(null)
    const [selectedProperty, setSelectedProperty] = useState<string>('')
    const [selectedApplication, setSelectedApplication] = useState<string>('')
    const [customFields, setCustomFields] = useState<any>({})
    const [isGenerating, setIsGenerating] = useState(false)

    // Reset custom fields when type changes
    useEffect(() => {
        setCustomFields({})
    }, [selectedType, selectedProperty, selectedApplication])

    // Fetch properties for dropdown
    const { data: properties, error: propError } = useQuery({
        queryKey: ['properties-simple'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('properties')
                .select('id, address, unit_number')
                .order('address')
            if (error) throw error
            return data || []
        }
    })

    // Fetch applications for dropdown
    const { data: applications, error: appError } = useQuery({
        queryKey: ['applications-simple'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('applications')
                .select('id, applicant_name, property:properties(address)')
                .order('created_at', { ascending: false })
            if (error) throw error
            return data || []
        }
    })

    // Fetch document history
    const { data: documents, isLoading: docsLoading, error: docsError, refetch } = useQuery({
        queryKey: ['documents'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20)
            if (error) throw error
            return data || []
        }
    })

    const handleGenerate = async () => {
        if (!selectedType) return

        // Validate requirements
        if (['showing_sheet', 'property_summary', 'lease_proposal'].includes(selectedType) && !selectedProperty) {
            alert('Please select a property')
            return
        }
        if (selectedType === 'application_summary' && !selectedApplication) {
            alert('Please select an application')
            return
        }

        setIsGenerating(true)
        try {
            const formData = new FormData()
            formData.append('type', selectedType)
            if (selectedProperty) formData.append('propertyId', selectedProperty)
            if (selectedApplication) formData.append('applicantId', selectedApplication)
            formData.append('customFields', JSON.stringify(customFields))

            const response = await fetch('/api/generate-document', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to generate document')
            }

            const result = await response.json()
            toast.success('Document generated successfully!')

            // Redirect to view the document
            if (result.documentId) {
                router.push(`/documents/${result.documentId}`)
            } else {
                refetch()
            }

        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Failed to generate document')
        } finally {
            setIsGenerating(false)
        }
    }

    const needsProperty = selectedType && ['showing_sheet', 'property_summary', 'lease_proposal'].includes(selectedType)
    const needsApplication = selectedType === 'application_summary'

    // Error State
    if (docsError || propError || appError) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
                <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Failed to load documents</h2>
                <p className="text-gray-500 mb-4">{(docsError as Error)?.message || 'An error occurred'}</p>
                <Button onClick={() => refetch()}>Try Again</Button>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl md:text-2xl font-bold">Document Generator</h1>
                <p className="text-gray-500 text-sm md:text-base">
                    Create professional real estate documents in seconds
                </p>
            </div>

            {/* Main Content - Responsive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Document Type Selection */}
                <Card>
                    <CardContent className="p-4 md:p-6">
                        <h2 className="font-semibold mb-4">Select Document Type</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {documentTypes.map(type => {
                                const Icon = type.icon
                                const isSelected = selectedType === type.id
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => {
                                            setSelectedType(type.id)
                                            setSelectedProperty('')
                                            setSelectedApplication('')
                                        }}
                                        className={`p-4 rounded-lg border-2 text-left transition-all ${isSelected
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className={`h-10 w-10 rounded-lg ${type.color} flex items-center justify-center mb-3`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="font-medium">{type.name}</h3>
                                        <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                                    </button>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Configuration Panel */}
                <Card>
                    <CardContent className="p-4 md:p-6">
                        <h2 className="font-semibold mb-4">Configure Document</h2>

                        {!selectedType ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <FileText className="h-12 w-12 text-gray-300 mb-4" />
                                <p className="text-gray-500">
                                    Select a document type to begin
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Property Selector */}
                                {needsProperty && (
                                    <div>
                                        <label className="text-sm font-medium mb-2 block uppercase text-xs tracking-wider text-slate-500">
                                            Select Property *
                                        </label>
                                        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="Choose a property..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {properties?.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.address}{p.unit_number ? ` #${p.unit_number}` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Application Selector */}
                                {needsApplication && (
                                    <div>
                                        <label className="text-sm font-medium mb-2 block uppercase text-xs tracking-wider text-slate-500">
                                            Select Application *
                                        </label>
                                        <Select value={selectedApplication} onValueChange={setSelectedApplication}>
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="Choose an application..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {applications?.map((a: any) => {
                                                    const property = Array.isArray(a.property) ? a.property[0] : a.property
                                                    return (
                                                        <SelectItem key={a.id} value={a.id}>
                                                            {a.applicant_name} - {property?.address || 'No property'}
                                                        </SelectItem>
                                                    )
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* --- Dynamic Custom Fields --- */}

                                {/* Showing Sheet Fields */}
                                {selectedType === 'showing_sheet' && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div>
                                            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">Showing Notes</label>
                                            <textarea
                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                                                placeholder="e.g. emphasize the natural light in the living room..."
                                                value={customFields.notes || ''}
                                                onChange={e => setCustomFields({ ...customFields, notes: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">Access Instructions</label>
                                            <input
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                placeholder="e.g. Lockbox code 1234..."
                                                value={customFields.accessNotes || ''}
                                                onChange={e => setCustomFields({ ...customFields, accessNotes: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Lease Proposal Fields */}
                                {selectedType === 'lease_proposal' && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div>
                                            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">Tenant Name *</label>
                                            <input
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                placeholder="e.g. John Doe"
                                                value={customFields.tenantName || ''}
                                                onChange={e => setCustomFields({ ...customFields, tenantName: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">Offer Rent ($)</label>
                                                <input
                                                    type="number"
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    placeholder="2500"
                                                    value={customFields.offerRent || ''}
                                                    onChange={e => setCustomFields({ ...customFields, offerRent: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">Term (Months)</label>
                                                <input
                                                    type="number"
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    placeholder="12"
                                                    value={customFields.leaseTerm || ''}
                                                    onChange={e => setCustomFields({ ...customFields, leaseTerm: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">Special Conditions</label>
                                            <textarea
                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                                                placeholder="e.g. Pets allowed with deposit..."
                                                value={customFields.conditions || ''}
                                                onChange={e => setCustomFields({ ...customFields, conditions: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Application Summary Fields */}
                                {selectedType === 'application_summary' && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div>
                                            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">Recommendation</label>
                                            <Select
                                                value={customFields.recommendation}
                                                onValueChange={(v) => setCustomFields({ ...customFields, recommendation: v })}
                                            >
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="Select Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Strong Approve">Strong Approve</SelectItem>
                                                    <SelectItem value="Approve">Approve</SelectItem>
                                                    <SelectItem value="Conditional">Conditional</SelectItem>
                                                    <SelectItem value="Deny">Deny</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">Risk Factors</label>
                                            <input
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                placeholder="e.g. Low credit score, irregular income..."
                                                value={customFields.riskFactors || ''}
                                                onChange={e => setCustomFields({ ...customFields, riskFactors: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">Internal Agent Notes</label>
                                            <textarea
                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                                                placeholder="e.g. Verified income via paystubs, seems reliable..."
                                                value={customFields.agentNote || ''}
                                                onChange={e => setCustomFields({ ...customFields, agentNote: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Property Summary (Marketing) Fields */}
                                {selectedType === 'property_summary' && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div>
                                            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">Target Audience</label>
                                            <input
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                placeholder="e.g. Young Professionals, Families..."
                                                value={customFields.targetAudience || ''}
                                                onChange={e => setCustomFields({ ...customFields, targetAudience: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">Call To Action</label>
                                            <input
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                placeholder="e.g. Schedule a private viewing today"
                                                value={customFields.callToAction || ''}
                                                onChange={e => setCustomFields({ ...customFields, callToAction: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">Highlight Features</label>
                                            <textarea
                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                                                placeholder="e.g. Newly renovated kitchen, rooftop access, proximity to subway..."
                                                value={customFields.highlightFeatures || ''}
                                                onChange={e => setCustomFields({ ...customFields, highlightFeatures: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Generate Button */}
                                <Button
                                    onClick={handleGenerate}
                                    disabled={
                                        isGenerating ||
                                        (needsProperty && !selectedProperty) ||
                                        (needsApplication && !selectedApplication) ||
                                        (selectedType === 'lease_proposal' && (!customFields.tenantName || !customFields.offerRent))
                                    }
                                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-blue-200 mt-4"
                                >
                                    {isGenerating ? (
                                        <>
                                            <div className="h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin mr-2" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            Generate Document
                                            <ChevronRight className="h-4 w-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Document History */}
            <Card>
                <CardContent className="p-4 md:p-6">
                    <h2 className="font-semibold mb-4">Document History</h2>

                    {docsLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                        </div>
                    ) : !documents || documents.length === 0 ? (
                        <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No documents yet</p>
                            <p className="text-sm text-gray-400">
                                Generate your first document using the templates above
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {documents.map(doc => (
                                <div
                                    key={doc.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{doc.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Clock className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                                            </div>
                                        </div>
                                    </div>
                                    {doc.pdf_url && (
                                        <Button variant="ghost" size="sm" asChild>
                                            <a href={doc.pdf_url} download>
                                                <Download className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
