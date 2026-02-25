'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    AlertTriangle,
    Sparkles,
    FileCheck,
    FilePlus,
    History,
    Zap,
    ArrowRight,
    Eye,
    Building2,
    MapPin,
    Check,
    Plus,
    Loader2
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useAccentColor } from '@/lib/hooks/useAccentColor'
import { TierGuard } from '@/components/auth/TierGuard'
import { useAuth } from '@/lib/hooks/useAuth'

const documentTypes = [
    {
        id: 'showing_sheet',
        name: 'Showing Sheet',
        description: 'For agents - property showing details',
        icon: ClipboardList,
        gradient: 'from-blue-500 to-blue-600',
        bgGradient: 'from-blue-50 to-blue-100',
        shadowColor: 'shadow-blue-200'
    },
    {
        id: 'lease_proposal',
        name: 'Lease Proposal',
        description: 'For landlords - lease terms',
        icon: FileText,
        gradient: 'from-emerald-500 to-emerald-600',
        bgGradient: 'from-emerald-50 to-emerald-100',
        shadowColor: 'shadow-emerald-200'
    },
    {
        id: 'application_summary',
        name: 'Application Summary',
        description: 'For landlords - applicant overview',
        icon: Users,
        gradient: 'from-violet-500 to-violet-600',
        bgGradient: 'from-violet-50 to-violet-100',
        shadowColor: 'shadow-violet-200'
    },
    {
        id: 'property_summary',
        name: 'Property Summary',
        description: 'Marketing - property details',
        icon: Home,
        gradient: 'from-amber-500 to-amber-600',
        bgGradient: 'from-amber-50 to-amber-100',
        shadowColor: 'shadow-amber-200'
    }
]

function DocumentsContent() {
    const router = useRouter()
    const supabase = createClient()
    const { colors } = useAccentColor()
    const searchParams = useSearchParams()
    const [selectedType, setSelectedType] = useState<string | null>(searchParams.get('type') || null)
    const [selectedProperty, setSelectedProperty] = useState<string>(searchParams.get('propertyId') || '')
    const [selectedApplication, setSelectedApplication] = useState<string>(searchParams.get('applicationId') || '')
    const [customFields, setCustomFields] = useState<any>({})
    const [isGenerating, setIsGenerating] = useState(false)

    // Sync search params if they change
    useEffect(() => {
        const type = searchParams.get('type')
        const appId = searchParams.get('applicationId')
        const propId = searchParams.get('propertyId')
        if (type) setSelectedType(type)
        if (appId) setSelectedApplication(appId)
        if (propId) setSelectedProperty(propId)
    }, [searchParams])

    // Reset custom fields when type changes
    useEffect(() => {
        setCustomFields({})
    }, [selectedType, selectedProperty, selectedApplication])

    const { isLoading: authLoading, company } = useAuth();
    const companyId = company?.id;

    // Fetch properties for dropdown
    const { data: properties, error: propError } = useQuery({
        queryKey: ['properties-simple', companyId],
        queryFn: async () => {
            if (!companyId) return []
            const { data, error } = await supabase
                .from('properties')
                .select('id, address, unit_number')
                .eq('company_id', companyId)
                .order('address')
            if (error) throw error
            return data || []
        },
        enabled: !!companyId
    })

    // Fetch applications for dropdown
    const { data: applications, error: appError } = useQuery({
        queryKey: ['applications-simple', companyId],
        queryFn: async () => {
            if (!companyId) return []
            const { data, error } = await supabase
                .from('applications')
                .select('id, applicant_name, applicant_email, applicant_phone, property_id, property:properties(address, rent)')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })
            if (error) throw error
            return data || []
        },
        enabled: !!companyId
    })

    // Auto-fill fields from selected application
    useEffect(() => {
        if (selectedApplication && applications) {
            const app: any = applications.find((a: any) => a.id === selectedApplication)
            if (app) {
                const prop = Array.isArray(app.property) ? app.property[0] : app.property
                setCustomFields((prev: any) => ({
                    ...prev,
                    tenantName: app.applicant_name,
                    tenantEmail: app.applicant_email,
                    tenantPhone: app.applicant_phone,
                    offerRent: prop?.rent || prev.offerRent
                }))
                // Also auto-select the property if linked
                if (app.property_id) {
                    setSelectedProperty(app.property_id)
                }
            }
        }
    }, [selectedApplication, applications])

    // Fetch document history
    const { data: documents, isLoading: docsLoading, error: docsError, refetch } = useQuery({
        queryKey: ['documents', companyId],
        queryFn: async () => {
            if (!companyId) return []
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })
                .limit(20)
            if (error) throw error
            return data || []
        },
        enabled: !!companyId
    })

    const handleGenerate = async () => {
        if (!selectedType) return

        // Validate requirements
        if (['showing_sheet', 'property_summary', 'lease_proposal'].includes(selectedType) && !selectedProperty) {
            toast.error('Please select a property')
            return
        }
        if (selectedType === 'application_summary' && !selectedApplication) {
            toast.error('Please select an application')
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
                const errorData = await response.json()
                const errorMessage = errorData.details || errorData.error || 'Failed to generate document';
                throw new Error(errorMessage)
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
            console.error('Generation Failed:', error)
            toast.error(error.message || 'Failed to generate document')
        } finally {
            setIsGenerating(false)
        }
    }

    const needsProperty = selectedType && ['showing_sheet', 'property_summary', 'lease_proposal'].includes(selectedType)
    const needsApplication = selectedType === 'application_summary'
    const selectedTypeData = documentTypes.find(t => t.id === selectedType)

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <Loader2 className={cn("w-10 h-10 animate-spin", colors.text)} />
            </div>
        )
    }

    if (!companyId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <p className="text-slate-500 font-medium">Unable to load workspace data.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                    Refresh Page
                </button>
            </div>
        );
    }

    // Error State
    if (docsError || propError || appError) {
        return (
            <div className="p-10 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="h-20 w-20 rounded-[2rem] bg-rose-100 flex items-center justify-center mb-6">
                    <AlertTriangle className="h-10 w-10 text-rose-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Failed to load documents</h2>
                <p className="text-slate-500 mb-6">{(docsError as Error)?.message || 'An error occurred'}</p>
                <Button onClick={() => refetch()} className="rounded-xl">Try Again</Button>
            </div>
        )
    }

    return (
        <TierGuard feature="documents">
            <div className="relative p-6 lg:p-10 space-y-8">
                {/* Background elements */}
                <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                    <div className={cn("absolute top-[5%] right-[10%] w-[45rem] h-[45rem] rounded-full blur-[120px] animate-float", colors.bgLight)} />
                    <div className="absolute bottom-[20%] left-[5%] w-[35rem] h-[35rem] bg-gradient-to-br from-violet-100/20 to-purple-100/20 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-5s' }} />
                </div>

                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 animate-in fade-in slide-in-from-left duration-500">
                    <div className="space-y-2">
                        <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-2", colors.text)}>
                            <FileText className="h-3 w-3" />
                            <span>Document Generator</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900">
                            Create <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", colors.gradient)}>Documents</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-lg">
                            Generate professional real estate documents in seconds
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={cn("flex items-center gap-2 px-4 py-2 rounded-2xl border", colors.bgLight, colors.border)}>
                            <Zap className={cn("h-4 w-4", colors.text)} />
                            <span className={cn("text-sm font-bold", colors.text)}>{documents?.length || 0} Documents Created</span>
                        </div>
                    </div>
                </div>

                {/* Main Content - Responsive Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '100ms' }}>
                    {/* Document Type Selection */}
                    <Card className="rounded-[2rem] border-slate-100/50 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/30 overflow-hidden">
                        <CardHeader className="p-6 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
                                    <FilePlus className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-black text-slate-900">Select Document Type</CardTitle>
                                    <p className="text-sm text-slate-500">Choose a template to get started</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                            className={cn(
                                                "group relative p-5 rounded-2xl text-left transition-all duration-300 overflow-hidden",
                                                isSelected
                                                    ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-400 shadow-lg shadow-blue-100"
                                                    : "bg-slate-50/50 border-2 border-transparent hover:border-slate-200 hover:bg-white hover:shadow-lg hover:-translate-y-0.5"
                                            )}
                                        >
                                            {/* Background decoration */}
                                            <div className={cn(
                                                "absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl transition-opacity duration-500",
                                                isSelected ? "opacity-40" : "opacity-0 group-hover:opacity-20",
                                                `bg-gradient-to-br ${type.gradient}`
                                            )} />

                                            <div className="relative">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className={cn(
                                                        "h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-300",
                                                        `bg-gradient-to-br ${type.gradient} ${type.shadowColor}`,
                                                        isSelected && "scale-110",
                                                        !isSelected && "group-hover:scale-105"
                                                    )}>
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                    {isSelected && (
                                                        <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center animate-in zoom-in duration-200">
                                                            <Check className="h-3.5 w-3.5 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <h3 className={cn(
                                                    "font-bold text-base transition-colors",
                                                    isSelected ? "text-blue-700" : "text-slate-900"
                                                )}>{type.name}</h3>
                                                <p className="text-xs text-slate-500 mt-1 font-medium">{type.description}</p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Configuration Panel */}
                    <Card className="rounded-[2rem] border-slate-100/50 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/30 overflow-hidden">
                        <CardHeader className="p-6 pb-4">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300",
                                    selectedTypeData
                                        ? `bg-gradient-to-br ${selectedTypeData.gradient} ${selectedTypeData.shadowColor} text-white`
                                        : "bg-slate-200 text-slate-400"
                                )}>
                                    <FileCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-black text-slate-900">Configure Document</CardTitle>
                                    <p className="text-sm text-slate-500">
                                        {selectedTypeData ? selectedTypeData.name : 'Select a type first'}
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                            {!selectedType ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="h-20 w-20 rounded-[1.5rem] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
                                        <FileText className="h-8 w-8 text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-medium">Select a document type to begin</p>
                                    <p className="text-sm text-slate-400 mt-1">Choose from the templates on the left</p>
                                </div>
                            ) : (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right duration-300">
                                    {/* Property Selector */}
                                    {needsProperty && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Building2 className="h-3 w-3" />
                                                Select Property *
                                            </label>
                                            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                                                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white/50 font-medium">
                                                    <SelectValue placeholder="Choose a property..." />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {properties?.map(p => (
                                                        <SelectItem key={p.id} value={p.id} className="rounded-lg">
                                                            <div className="flex items-center gap-2">
                                                                <MapPin className="h-3 w-3 text-slate-400" />
                                                                {p.address}{p.unit_number ? ` #${p.unit_number}` : ''}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {/* Application Selector */}
                                    {needsApplication && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Users className="h-3 w-3" />
                                                Select Application *
                                            </label>
                                            <Select value={selectedApplication} onValueChange={setSelectedApplication}>
                                                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white/50 font-medium">
                                                    <SelectValue placeholder="Choose an application..." />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {applications?.map((a: any) => {
                                                        const property = Array.isArray(a.property) ? a.property[0] : a.property
                                                        return (
                                                            <SelectItem key={a.id} value={a.id} className="rounded-lg">
                                                                {a.applicant_name} - {property?.address || 'No property'}
                                                            </SelectItem>
                                                        )
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {/* --- Dynamic Custom Fields --- */}

                                    {/* Showing Sheet Fields - COMPREHENSIVE */}
                                    {selectedType === 'showing_sheet' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {/* Showing Schedule */}
                                            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Showing Schedule</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Date *</label>
                                                        <input
                                                            type="date"
                                                            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                            value={customFields.showingDate || ''}
                                                            onChange={e => setCustomFields({ ...customFields, showingDate: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Time *</label>
                                                        <input
                                                            type="time"
                                                            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                            value={customFields.showingTime || ''}
                                                            onChange={e => setCustomFields({ ...customFields, showingTime: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Client Information */}
                                            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Client Details</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input
                                                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                        placeholder="Client Name"
                                                        value={customFields.clientName || ''}
                                                        onChange={e => setCustomFields({ ...customFields, clientName: e.target.value })}
                                                    />
                                                    <input
                                                        type="tel"
                                                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                        placeholder="Client Phone"
                                                        value={customFields.clientPhone || ''}
                                                        onChange={e => setCustomFields({ ...customFields, clientPhone: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Access & Notes */}
                                            <div className="space-y-3">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Access Instructions (Confidential)</label>
                                                    <input
                                                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                        placeholder="e.g. Lockbox code #1234, key at office..."
                                                        value={customFields.accessNotes || ''}
                                                        onChange={e => setCustomFields({ ...customFields, accessNotes: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Key Talking Points</label>
                                                    <textarea
                                                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[80px] resize-none"
                                                        placeholder="e.g. Emphasize natural lighting, new appliances, proximity to transit..."
                                                        value={customFields.notes || ''}
                                                        onChange={e => setCustomFields({ ...customFields, notes: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Lease Proposal Fields - COMPREHENSIVE */}
                                    {selectedType === 'lease_proposal' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {/* Tenant Information */}
                                            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tenant Details</p>
                                                <input
                                                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                                    placeholder="Full Legal Name *"
                                                    value={customFields.tenantName || ''}
                                                    onChange={e => setCustomFields({ ...customFields, tenantName: e.target.value })}
                                                />
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input
                                                        type="email"
                                                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                                        placeholder="Email Address"
                                                        value={customFields.tenantEmail || ''}
                                                        onChange={e => setCustomFields({ ...customFields, tenantEmail: e.target.value })}
                                                    />
                                                    <input
                                                        type="tel"
                                                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                                        placeholder="Phone Number"
                                                        value={customFields.tenantPhone || ''}
                                                        onChange={e => setCustomFields({ ...customFields, tenantPhone: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Financial Terms */}
                                            <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Financial Terms</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Monthly Rent *</label>
                                                        <div className="relative">
                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                                            <input
                                                                type="number"
                                                                className="flex h-12 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                                                placeholder="2500"
                                                                value={customFields.offerRent || ''}
                                                                onChange={e => setCustomFields({ ...customFields, offerRent: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Security Deposit *</label>
                                                        <div className="relative">
                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                                            <input
                                                                type="number"
                                                                className="flex h-12 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                                                placeholder="2500"
                                                                value={customFields.securityDeposit || ''}
                                                                onChange={e => setCustomFields({ ...customFields, securityDeposit: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Lease Term</label>
                                                        <Select
                                                            value={customFields.leaseTerm || '12'}
                                                            onValueChange={(v) => setCustomFields({ ...customFields, leaseTerm: v })}
                                                        >
                                                            <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white font-medium">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl">
                                                                <SelectItem value="6">6 Months</SelectItem>
                                                                <SelectItem value="12">12 Months</SelectItem>
                                                                <SelectItem value="18">18 Months</SelectItem>
                                                                <SelectItem value="24">24 Months</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Proposed Start Date *</label>
                                                        <input
                                                            type="date"
                                                            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                                            value={customFields.startDate || ''}
                                                            onChange={e => setCustomFields({ ...customFields, startDate: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Special Conditions */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Special Conditions</label>
                                                <textarea
                                                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all min-h-[80px] resize-none"
                                                    placeholder="e.g. Pets allowed with deposit, parking included, utilities..."
                                                    value={customFields.conditions || ''}
                                                    onChange={e => setCustomFields({ ...customFields, conditions: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Application Summary Fields - COMPREHENSIVE */}
                                    {selectedType === 'application_summary' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {/* Verification Options */}
                                            <div className="bg-violet-50 rounded-xl p-4 space-y-3">
                                                <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Include in Report</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Credit Score', 'Income Verification', 'Background Check', 'Rental History', 'Employment'].map(item => (
                                                        <button
                                                            key={item}
                                                            type="button"
                                                            onClick={() => {
                                                                const current = customFields.includeItems || [];
                                                                if (current.includes(item)) {
                                                                    setCustomFields({ ...customFields, includeItems: current.filter((i: string) => i !== item) });
                                                                } else {
                                                                    setCustomFields({ ...customFields, includeItems: [...current, item] });
                                                                }
                                                            }}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                                (customFields.includeItems || []).includes(item)
                                                                    ? "bg-violet-600 text-white"
                                                                    : "bg-white border border-violet-200 text-violet-600 hover:bg-violet-100"
                                                            )}
                                                        >
                                                            {item}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Recommendation & Risk */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Recommendation *</label>
                                                    <Select
                                                        value={customFields.recommendation}
                                                        onValueChange={(v) => setCustomFields({ ...customFields, recommendation: v })}
                                                    >
                                                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white font-medium">
                                                            <SelectValue placeholder="Select..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl">
                                                            <SelectItem value="Strong Approve" className="rounded-lg">✅ Strong Approve</SelectItem>
                                                            <SelectItem value="Approve" className="rounded-lg">👍 Approve</SelectItem>
                                                            <SelectItem value="Conditional" className="rounded-lg">⚠️ Conditional</SelectItem>
                                                            <SelectItem value="Deny" className="rounded-lg">❌ Deny</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Risk Level</label>
                                                    <Select
                                                        value={customFields.riskLevel}
                                                        onValueChange={(v) => setCustomFields({ ...customFields, riskLevel: v })}
                                                    >
                                                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white font-medium">
                                                            <SelectValue placeholder="Select..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl">
                                                            <SelectItem value="Low">🟢 Low Risk</SelectItem>
                                                            <SelectItem value="Medium">🟡 Medium Risk</SelectItem>
                                                            <SelectItem value="High">🔴 High Risk</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* Risk Factors */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Risk Factors (if any)</label>
                                                <input
                                                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                                    placeholder="e.g. Low credit score, irregular income history..."
                                                    value={customFields.riskFactors || ''}
                                                    onChange={e => setCustomFields({ ...customFields, riskFactors: e.target.value })}
                                                />
                                            </div>

                                            {/* Agent Notes */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Internal Agent Notes</label>
                                                <textarea
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all min-h-[80px] resize-none"
                                                    placeholder="e.g. Verified income via paystubs, spoke with previous landlord..."
                                                    value={customFields.agentNote || ''}
                                                    onChange={e => setCustomFields({ ...customFields, agentNote: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Property Summary (Marketing) Fields - COMPREHENSIVE */}
                                    {selectedType === 'property_summary' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {/* Marketing Tone */}
                                            <div className="bg-amber-50 rounded-xl p-4 space-y-3">
                                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Marketing Style</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Luxury', 'Modern', 'Family-Friendly', 'Investment', 'Urban'].map(style => (
                                                        <button
                                                            key={style}
                                                            type="button"
                                                            onClick={() => setCustomFields({ ...customFields, marketingStyle: style })}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                                customFields.marketingStyle === style
                                                                    ? "bg-amber-600 text-white"
                                                                    : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-100"
                                                            )}
                                                        >
                                                            {style}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Target & Availability */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Target Audience</label>
                                                    <input
                                                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                                        placeholder="e.g. Young Professionals, Families..."
                                                        value={customFields.targetAudience || ''}
                                                        onChange={e => setCustomFields({ ...customFields, targetAudience: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Available Date</label>
                                                    <input
                                                        type="date"
                                                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                                        value={customFields.availableDate || ''}
                                                        onChange={e => setCustomFields({ ...customFields, availableDate: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Highlight Features */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Key Features to Highlight</label>
                                                <textarea
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all min-h-[80px] resize-none"
                                                    placeholder="e.g. Newly renovated kitchen, rooftop access, proximity to transit, in-unit laundry..."
                                                    value={customFields.highlightFeatures || ''}
                                                    onChange={e => setCustomFields({ ...customFields, highlightFeatures: e.target.value })}
                                                />
                                            </div>

                                            {/* Call to Action */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Call To Action</label>
                                                <input
                                                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                                    placeholder="e.g. Schedule a private viewing today!"
                                                    value={customFields.callToAction || ''}
                                                    onChange={e => setCustomFields({ ...customFields, callToAction: e.target.value })}
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
                                        className={cn(
                                            "w-full h-14 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl mt-4 border-0",
                                            selectedTypeData
                                                ? `bg-gradient-to-r ${selectedTypeData.gradient} ${selectedTypeData.shadowColor}`
                                                : cn("bg-gradient-to-r", colors.gradient, colors.shadow)
                                        )}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="h-5 w-5 mr-2" />
                                                Generate Document
                                                <ArrowRight className="h-5 w-5 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Document History */}
                <Card className="rounded-[2rem] border-slate-100/50 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/30 overflow-hidden animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '200ms' }}>
                    <CardHeader className="p-6 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg shadow-slate-300">
                                    <History className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-black text-slate-900">Document History</CardTitle>
                                    <p className="text-sm text-slate-500">Your recently generated documents</p>
                                </div>
                            </div>
                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                {documents?.length || 0} Documents
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        {docsLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
                            </div>
                        ) : !documents || documents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="h-20 w-20 rounded-[1.5rem] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
                                    <FileText className="h-8 w-8 text-slate-300" />
                                </div>
                                <p className="font-bold text-slate-900 mb-1">No documents yet</p>
                                <p className="text-sm text-slate-500 max-w-[300px]">
                                    Generate your first document using the templates above
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {documents.map(doc => {
                                    const docType = documentTypes.find(t => doc.type === t.id || doc.title?.toLowerCase().includes(t.name.toLowerCase()))
                                    const Icon = docType?.icon || FileText
                                    return (
                                        <div
                                            key={doc.id}
                                            onClick={() => router.push(`/documents/${doc.id}`)}
                                            className="group flex items-start gap-4 p-5 rounded-2xl bg-slate-50/50 border-2 border-transparent hover:border-blue-200 hover:bg-white transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                                        >
                                            <div className={cn(
                                                "h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-all flex-shrink-0 group-hover:scale-110",
                                                docType ? `bg-gradient-to-br ${docType.gradient} ${docType.shadowColor}` : "bg-gradient-to-br from-slate-500 to-slate-600 shadow-slate-200"
                                            )}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                                    {doc.title}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-blue-50">
                                                    <Eye className="h-4 w-4 text-blue-600" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TierGuard>
    )
}

export default function DocumentsPage() {
    return (
        <Suspense fallback={
            <div className="p-10 space-y-8 animate-pulse">
                <div className="h-10 w-64 bg-slate-100 rounded-xl" />
                <div className="grid grid-cols-2 gap-6">
                    <div className="h-[400px] bg-slate-50 rounded-[2rem]" />
                    <div className="h-[400px] bg-slate-50 rounded-[2rem]" />
                </div>
            </div>
        }>
            <DocumentsContent />
        </Suspense>
    )
}
