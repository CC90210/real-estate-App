'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAccentColor } from '@/lib/hooks/useAccentColor'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    ClipboardCheck,
    Plus,
    Search,
    CheckCircle,
    Clock,
    XCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    Camera,
    FileText,
    Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import {
    DEFAULT_INSPECTION_ITEMS,
    type Inspection,
    type InspectionItem,
    type InspectionGateStatus,
    type InspectionItemStatus,
} from '@/types/database'

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
    InspectionGateStatus,
    { label: string; color: string; icon: React.ReactNode }
> = {
    not_started: {
        label: 'Not Started',
        color: 'bg-slate-100 text-slate-600',
        icon: <Clock className="w-3 h-3" />,
    },
    in_progress: {
        label: 'In Progress',
        color: 'bg-blue-100 text-blue-700',
        icon: <Clock className="w-3 h-3" />,
    },
    passed: {
        label: 'Passed',
        color: 'bg-emerald-100 text-emerald-700',
        icon: <CheckCircle className="w-3 h-3" />,
    },
    failed: {
        label: 'Failed',
        color: 'bg-red-100 text-red-700',
        icon: <XCircle className="w-3 h-3" />,
    },
    overridden: {
        label: 'Overridden',
        color: 'bg-amber-100 text-amber-700',
        icon: <AlertTriangle className="w-3 h-3" />,
    },
}

const ITEM_STATUS_CONFIG: Record<
    InspectionItemStatus,
    { label: string; color: string }
> = {
    pass: { label: 'Pass', color: 'bg-emerald-100 text-emerald-700' },
    fail: { label: 'Fail', color: 'bg-red-100 text-red-700' },
    not_checked: { label: 'Unchecked', color: 'bg-slate-100 text-slate-500' },
}

const CATEGORY_COLORS: Record<string, string> = {
    kitchen: 'bg-orange-100 text-orange-700',
    bathroom: 'bg-blue-100 text-blue-700',
    electrical: 'bg-yellow-100 text-yellow-700',
    safety: 'bg-red-100 text-red-700',
    hvac: 'bg-indigo-100 text-indigo-700',
    general: 'bg-slate-100 text-slate-600',
}

const FILTER_STATUSES = ['all', 'not_started', 'in_progress', 'passed', 'failed'] as const
type FilterStatus = (typeof FILTER_STATUSES)[number]

// ─── Types ────────────────────────────────────────────────────────────────────

interface InspectionRow extends Inspection {
    properties: { address: string; unit_number: string | null } | null
    items?: InspectionItem[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InspectionsPage() {
    const supabase = createClient()
    const { colors } = useAccentColor()
    const { user, isLoading: authLoading, company } = useAuth()
    const resolvedCompanyId = company?.id
    const queryClient = useQueryClient()

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [newPropertyId, setNewPropertyId] = useState('')

    // ─── Queries ────────────────────────────────────────────────────────────

    const { data: inspections, isLoading } = useQuery({
        queryKey: ['inspections', resolvedCompanyId],
        queryFn: async () => {
            if (!resolvedCompanyId) return []
            const { data, error } = await supabase
                .from('inspections')
                .select('*, properties(address, unit_number)')
                .eq('company_id', resolvedCompanyId)
                .order('created_at', { ascending: false })
            if (error) throw error
            return (data || []) as InspectionRow[]
        },
        enabled: !!resolvedCompanyId,
        staleTime: 60 * 1000,
    })

    const { data: properties } = useQuery({
        queryKey: ['properties-select', resolvedCompanyId],
        queryFn: async () => {
            if (!resolvedCompanyId) return []
            const { data } = await supabase
                .from('properties')
                .select('id, address, unit_number')
                .eq('company_id', resolvedCompanyId)
                .order('address')
            return data || []
        },
        enabled: !!resolvedCompanyId,
    })

    // Fetch items for the expanded inspection
    const { data: expandedItems, isLoading: itemsLoading } = useQuery({
        queryKey: ['inspection-items', expandedId],
        queryFn: async () => {
            if (!expandedId) return []
            const { data, error } = await supabase
                .from('inspection_items')
                .select('*')
                .eq('inspection_id', expandedId)
                .order('created_at', { ascending: true })
            if (error) throw error
            return (data || []) as InspectionItem[]
        },
        enabled: !!expandedId,
        staleTime: 30 * 1000,
    })

    // ─── Mutations ───────────────────────────────────────────────────────────

    const createInspection = useMutation({
        mutationFn: async (propertyId: string) => {
            if (!resolvedCompanyId || !user?.id) {
                throw new Error('Not authenticated properly. Please refresh.')
            }

            // Resolve inspector name: prefer profile full_name, fallback to email
            const inspectorName =
                (user as { user_metadata?: { full_name?: string } }).user_metadata?.full_name ||
                user.email ||
                'Agent'

            // Insert inspection record
            const { data: inspection, error: inspErr } = await supabase
                .from('inspections')
                .insert({
                    company_id: resolvedCompanyId,
                    property_id: propertyId,
                    inspected_by: user.id,
                    inspected_by_name: inspectorName,
                    status: 'not_started',
                })
                .select('id')
                .single()
            if (inspErr) throw inspErr

            // Insert default checklist items
            const itemsPayload = DEFAULT_INSPECTION_ITEMS.map((item) => ({
                inspection_id: inspection.id,
                label: item.label,
                category: item.category,
                status: 'not_checked' as InspectionItemStatus,
                notes: null,
                photo_urls: null,
                maintenance_request_id: null,
                landlord_override: false,
                landlord_override_at: null,
                landlord_override_reason: null,
            }))

            const { error: itemsErr } = await supabase
                .from('inspection_items')
                .insert(itemsPayload)
            if (itemsErr) throw itemsErr

            return inspection.id
        },
        onSuccess: (newId) => {
            queryClient.invalidateQueries({ queryKey: ['inspections', resolvedCompanyId] })
            toast.success('Inspection created. Start checking items.')
            setDialogOpen(false)
            setNewPropertyId('')
            // Auto-expand the newly created inspection
            setExpandedId(newId)
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const updateItemStatus = useMutation({
        mutationFn: async ({
            itemId,
            status,
        }: {
            itemId: string
            status: InspectionItemStatus
        }) => {
            const { error } = await supabase
                .from('inspection_items')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', itemId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inspection-items', expandedId] })
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const updateItemNotes = useMutation({
        mutationFn: async ({ itemId, notes }: { itemId: string; notes: string }) => {
            const { error } = await supabase
                .from('inspection_items')
                .update({ notes, updated_at: new Date().toISOString() })
                .eq('id', itemId)
            if (error) throw error
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const signAndComplete = useMutation({
        mutationFn: async (inspectionId: string) => {
            if (!expandedItems) throw new Error('No items loaded.')

            const hasUnchecked = expandedItems.some((i) => i.status === 'not_checked')
            if (hasUnchecked) {
                throw new Error('All items must be checked (pass or fail) before signing.')
            }

            const hasFailed = expandedItems.some((i) => i.status === 'fail')
            const newStatus: InspectionGateStatus = hasFailed ? 'failed' : 'passed'

            const { error } = await supabase
                .from('inspections')
                .update({
                    status: newStatus,
                    signed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', inspectionId)
            if (error) throw error
            return { status: newStatus, hasFailed }
        },
        onSuccess: ({ status, hasFailed }) => {
            queryClient.invalidateQueries({ queryKey: ['inspections', resolvedCompanyId] })
            if (hasFailed) {
                toast.warning('Inspection signed with failed items. Review issues below.')
            } else {
                toast.success('Inspection passed and signed. Property can now be listed.')
            }
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const generateMaintenanceRequest = useMutation({
        mutationFn: async ({
            inspectionId,
            propertyId,
        }: {
            inspectionId: string
            propertyId: string
        }) => {
            if (!resolvedCompanyId || !user?.id || !expandedItems) {
                throw new Error('Missing required data.')
            }

            const failedItems = expandedItems.filter((i) => i.status === 'fail')
            if (failedItems.length === 0) {
                throw new Error('No failed items to generate a request for.')
            }

            const description = failedItems
                .map((i) => `• ${i.label}${i.notes ? `: ${i.notes}` : ''}`)
                .join('\n')

            const { error } = await supabase.from('maintenance_requests').insert({
                company_id: resolvedCompanyId,
                property_id: propertyId,
                submitted_by: user.id,
                title: `Pre-Rental Inspection — ${failedItems.length} issue(s) found`,
                description,
                category: 'general',
                priority: 'high',
                status: 'open',
            })
            if (error) throw error
        },
        onSuccess: () => {
            toast.success('Maintenance request created for failed inspection items.')
        },
        onError: (err: Error) => toast.error(err.message),
    })

    // ─── Derived state ───────────────────────────────────────────────────────

    const pendingCount =
        inspections?.filter(
            (i) => i.status === 'not_started' || i.status === 'in_progress'
        ).length || 0
    const passedCount = inspections?.filter((i) => i.status === 'passed').length || 0
    const failedCount =
        inspections?.filter((i) => i.status === 'failed').length || 0

    const filtered = (inspections || []).filter((insp) => {
        const address = insp.properties?.address?.toLowerCase() || ''
        const unit = insp.properties?.unit_number?.toLowerCase() || ''
        const q = search.toLowerCase()
        const matchSearch = address.includes(q) || unit.includes(q)
        const matchStatus =
            statusFilter === 'all' || insp.status === statusFilter
        return matchSearch && matchStatus
    })

    const isSyncing = isLoading

    // ─── Auth guards ─────────────────────────────────────────────────────────

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <Loader2 className={cn('w-10 h-10 animate-spin', colors.text)} />
            </div>
        )
    }

    if (!resolvedCompanyId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <p className="text-slate-500 font-medium">
                    Unable to load workspace data.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                    Refresh Page
                </button>
            </div>
        )
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
            {/* Syncing indicator */}
            {isSyncing && (
                <div className="fixed top-24 right-10 z-50 flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-slate-100 px-3 py-1.5 rounded-full shadow-sm">
                    <Loader2 className={cn('w-3 h-3 animate-spin', colors.text)} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Syncing...
                    </span>
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div
                        className={cn(
                            'flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1',
                            colors.text
                        )}
                    >
                        <ClipboardCheck className="h-3 w-3" />
                        <span>Pre-Rental Inspection</span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
                        Inspections
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">
                        Mandatory property inspection before listing. Complete all items to
                        unlock listing.
                    </p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className={cn('gap-2 font-bold rounded-xl shadow-lg', colors.bg)}
                        >
                            <Plus className="w-4 h-4" /> New Inspection
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black">
                                Start New Inspection
                            </DialogTitle>
                            <DialogDescription>
                                Select a property. A default checklist will be created
                                automatically.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                createInspection.mutate(newPropertyId)
                            }}
                            className="space-y-4 mt-4"
                        >
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Property
                                </label>
                                <select
                                    className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                                    value={newPropertyId}
                                    onChange={(e) => setNewPropertyId(e.target.value)}
                                    required
                                >
                                    <option value="">Select property...</option>
                                    {properties?.map(
                                        (p: { id: string; address: string; unit_number: string | null }) => (
                                            <option key={p.id} value={p.id}>
                                                {p.address}
                                                {p.unit_number ? ` — ${p.unit_number}` : ''}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>
                            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Default Checklist ({DEFAULT_INSPECTION_ITEMS.length} items)
                                </p>
                                <ul className="space-y-1">
                                    {DEFAULT_INSPECTION_ITEMS.map((item) => (
                                        <li
                                            key={item.id}
                                            className="flex items-center gap-2 text-xs text-slate-600"
                                        >
                                            <span
                                                className={cn(
                                                    'text-[10px] px-1.5 py-0.5 rounded font-bold capitalize',
                                                    CATEGORY_COLORS[item.category] ||
                                                        'bg-slate-100 text-slate-500'
                                                )}
                                            >
                                                {item.category}
                                            </span>
                                            {item.label}
                                            {item.required && (
                                                <span className="text-red-400 text-[10px]">*</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <Button
                                type="submit"
                                className={cn('w-full font-bold', colors.bg)}
                                disabled={createInspection.isPending}
                            >
                                {createInspection.isPending && (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                )}
                                Start Inspection
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{pendingCount}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Pending
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{passedCount}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Passed
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card
                    className={cn(
                        'border-0 shadow-sm bg-gradient-to-br to-white',
                        failedCount > 0 ? 'from-red-50' : 'from-slate-50'
                    )}
                >
                    <CardContent className="p-5 flex items-center gap-4">
                        <div
                            className={cn(
                                'w-12 h-12 rounded-2xl flex items-center justify-center',
                                failedCount > 0 ? 'bg-red-100' : 'bg-slate-100'
                            )}
                        >
                            <XCircle
                                className={cn(
                                    'w-6 h-6',
                                    failedCount > 0 ? 'text-red-600' : 'text-slate-400'
                                )}
                            />
                        </div>
                        <div>
                            <p
                                className={cn(
                                    'text-2xl font-black',
                                    failedCount > 0 ? 'text-red-600' : 'text-slate-900'
                                )}
                            >
                                {failedCount}
                            </p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Issues Found
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Filter Bar ── */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by property address..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 rounded-xl"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {FILTER_STATUSES.map((s) => (
                        <Button
                            key={s}
                            variant={statusFilter === s ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                'rounded-lg text-xs font-bold capitalize',
                                statusFilter === s && colors.bg
                            )}
                        >
                            {s === 'all'
                                ? 'All'
                                : s === 'not_started'
                                ? 'Pending'
                                : s === 'in_progress'
                                ? 'In Progress'
                                : s.charAt(0).toUpperCase() + s.slice(1)}
                        </Button>
                    ))}
                </div>
            </div>

            {/* ── List ── */}
            {filtered.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <ClipboardCheck className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-lg font-bold text-slate-400">No inspections found</p>
                        <p className="text-sm text-slate-300 mt-1">
                            {search || statusFilter !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Create your first inspection to get started'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map((insp) => {
                        const isExpanded = expandedId === insp.id
                        const statusCfg =
                            STATUS_CONFIG[insp.status] || STATUS_CONFIG.not_started
                        const items = isExpanded ? expandedItems : undefined
                        const totalItems = items?.length ?? DEFAULT_INSPECTION_ITEMS.length
                        const checkedItems =
                            items?.filter((i) => i.status !== 'not_checked').length ?? 0
                        const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0
                        const failedItems = items?.filter((i) => i.status === 'fail') ?? []
                        const canSign =
                            items !== undefined &&
                            items.every((i) => i.status !== 'not_checked')
                        const isSigned = !!insp.signed_at

                        return (
                            <Card
                                key={insp.id}
                                className="border-0 shadow-sm hover:shadow-md transition-all"
                            >
                                <CardContent className="p-5">
                                    {/* Card header row */}
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div
                                                className={cn(
                                                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                                                    insp.status === 'passed'
                                                        ? 'bg-emerald-100'
                                                        : insp.status === 'failed'
                                                        ? 'bg-red-100'
                                                        : insp.status === 'in_progress'
                                                        ? 'bg-blue-100'
                                                        : 'bg-slate-100'
                                                )}
                                            >
                                                <ClipboardCheck
                                                    className={cn(
                                                        'w-5 h-5',
                                                        insp.status === 'passed'
                                                            ? 'text-emerald-600'
                                                            : insp.status === 'failed'
                                                            ? 'text-red-600'
                                                            : insp.status === 'in_progress'
                                                            ? 'text-blue-600'
                                                            : 'text-slate-400'
                                                    )}
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-bold text-slate-900 truncate">
                                                        {insp.properties?.address ||
                                                            'Unknown property'}
                                                        {insp.properties?.unit_number
                                                            ? ` — ${insp.properties.unit_number}`
                                                            : ''}
                                                    </p>
                                                    <Badge
                                                        className={cn(
                                                            'text-[10px] font-black uppercase flex items-center gap-1',
                                                            statusCfg.color
                                                        )}
                                                    >
                                                        {statusCfg.icon}
                                                        {statusCfg.label}
                                                    </Badge>
                                                    {isSigned && (
                                                        <Badge className="text-[10px] font-black uppercase bg-purple-100 text-purple-700">
                                                            Signed
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-400 mt-0.5">
                                                    {insp.inspected_by_name} •{' '}
                                                    {formatDistanceToNow(
                                                        new Date(insp.created_at),
                                                        { addSuffix: true }
                                                    )}
                                                </p>

                                                {/* Progress bar */}
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                            Progress
                                                        </span>
                                                        <span className="text-[10px] font-black text-slate-500">
                                                            {isExpanded
                                                                ? `${checkedItems}/${totalItems}`
                                                                : `—/${DEFAULT_INSPECTION_ITEMS.length}`}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full max-w-xs">
                                                        <div
                                                            className={cn(
                                                                'h-full rounded-full transition-all duration-500',
                                                                insp.status === 'passed'
                                                                    ? 'bg-emerald-500'
                                                                    : insp.status === 'failed'
                                                                    ? 'bg-red-500'
                                                                    : colors.bg
                                                            )}
                                                            style={{
                                                                width: isExpanded
                                                                    ? `${progress}%`
                                                                    : insp.status === 'passed' ||
                                                                      insp.status === 'failed'
                                                                    ? '100%'
                                                                    : '0%',
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action button */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs font-bold gap-1.5 flex-shrink-0"
                                            onClick={() =>
                                                setExpandedId(isExpanded ? null : insp.id)
                                            }
                                        >
                                            {isExpanded ? (
                                                <>
                                                    <ChevronUp className="w-3 h-3" /> Collapse
                                                </>
                                            ) : insp.status === 'passed' ||
                                              insp.status === 'failed' ||
                                              isSigned ? (
                                                <>
                                                    <FileText className="w-3 h-3" /> View Report
                                                </>
                                            ) : (
                                                <>
                                                    <ClipboardCheck className="w-3 h-3" />{' '}
                                                    Continue Inspection
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {/* ── Expanded Detail Panel ── */}
                                    {isExpanded && (
                                        <div className="mt-5 border-t border-slate-100 pt-5 space-y-6">
                                            {itemsLoading ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <Loader2
                                                        className={cn(
                                                            'w-6 h-6 animate-spin',
                                                            colors.text
                                                        )}
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Group items by category */}
                                                    {groupByCategory(expandedItems ?? []).map(
                                                        ({ category, items: catItems }) => (
                                                            <div key={category}>
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <span
                                                                        className={cn(
                                                                            'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg capitalize',
                                                                            CATEGORY_COLORS[
                                                                                category
                                                                            ] ||
                                                                                'bg-slate-100 text-slate-500'
                                                                        )}
                                                                    >
                                                                        {category}
                                                                    </span>
                                                                    <div className="flex-1 h-px bg-slate-100" />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    {catItems.map((item) => (
                                                                        <InspectionItemRow
                                                                            key={item.id}
                                                                            item={item}
                                                                            isSigned={isSigned}
                                                                            onStatusChange={(
                                                                                status
                                                                            ) =>
                                                                                updateItemStatus.mutate(
                                                                                    {
                                                                                        itemId: item.id,
                                                                                        status,
                                                                                    }
                                                                                )
                                                                            }
                                                                            onNotesChange={(
                                                                                notes
                                                                            ) =>
                                                                                updateItemNotes.mutate(
                                                                                    {
                                                                                        itemId: item.id,
                                                                                        notes,
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )
                                                    )}

                                                    {/* Sign & Complete */}
                                                    {!isSigned && (
                                                        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                                                            <Button
                                                                className={cn(
                                                                    'font-bold flex-1',
                                                                    colors.bg
                                                                )}
                                                                disabled={
                                                                    !canSign ||
                                                                    signAndComplete.isPending
                                                                }
                                                                onClick={() =>
                                                                    signAndComplete.mutate(insp.id)
                                                                }
                                                            >
                                                                {signAndComplete.isPending ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                                ) : (
                                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                                )}
                                                                Sign &amp; Complete Inspection
                                                            </Button>
                                                            {!canSign && (
                                                                <p className="text-xs text-slate-400 self-center">
                                                                    All items must be checked before
                                                                    signing.
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Failed items: offer to create maintenance request */}
                                                    {isSigned && failedItems.length > 0 && (
                                                        <div className="pt-4 border-t border-red-100 bg-red-50 rounded-xl p-4 space-y-3">
                                                            <div className="flex items-start gap-2">
                                                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="text-sm font-bold text-red-700">
                                                                        {failedItems.length} item
                                                                        {failedItems.length !== 1
                                                                            ? 's'
                                                                            : ''}{' '}
                                                                        failed
                                                                    </p>
                                                                    <ul className="mt-1 space-y-0.5">
                                                                        {failedItems.map((fi) => (
                                                                            <li
                                                                                key={fi.id}
                                                                                className="text-xs text-red-600"
                                                                            >
                                                                                • {fi.label}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="w-full border-red-200 text-red-700 font-bold hover:bg-red-100 gap-2"
                                                                disabled={
                                                                    generateMaintenanceRequest.isPending
                                                                }
                                                                onClick={() =>
                                                                    generateMaintenanceRequest.mutate(
                                                                        {
                                                                            inspectionId: insp.id,
                                                                            propertyId:
                                                                                insp.property_id,
                                                                        }
                                                                    )
                                                                }
                                                            >
                                                                {generateMaintenanceRequest.isPending ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Wrench className="w-4 h-4" />
                                                                )}
                                                                Generate Maintenance Request
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {/* Signed confirmation */}
                                                    {isSigned && (
                                                        <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
                                                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                                                            Signed{' '}
                                                            {formatDistanceToNow(
                                                                new Date(insp.signed_at!),
                                                                { addSuffix: true }
                                                            )}{' '}
                                                            by {insp.inspected_by_name}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface InspectionItemRowProps {
    item: InspectionItem
    isSigned: boolean
    onStatusChange: (status: InspectionItemStatus) => void
    onNotesChange: (notes: string) => void
}

function InspectionItemRow({
    item,
    isSigned,
    onStatusChange,
    onNotesChange,
}: InspectionItemRowProps) {
    const [localNotes, setLocalNotes] = useState(item.notes ?? '')
    const [notesOpen, setNotesOpen] = useState(false)
    const statusCfg = ITEM_STATUS_CONFIG[item.status] || ITEM_STATUS_CONFIG.not_checked

    const handleNotesBlur = () => {
        if (localNotes !== (item.notes ?? '')) {
            onNotesChange(localNotes)
        }
    }

    return (
        <div
            className={cn(
                'rounded-xl border p-3 transition-all',
                item.status === 'pass'
                    ? 'border-emerald-100 bg-emerald-50/40'
                    : item.status === 'fail'
                    ? 'border-red-100 bg-red-50/40'
                    : 'border-slate-100 bg-white'
            )}
        >
            <div className="flex items-start gap-3">
                {/* Status toggle buttons */}
                <div className="flex gap-1 flex-shrink-0 mt-0.5">
                    <button
                        type="button"
                        disabled={isSigned}
                        onClick={() => onStatusChange('pass')}
                        className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all',
                            item.status === 'pass'
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600',
                            isSigned && 'opacity-60 cursor-not-allowed'
                        )}
                        title="Mark as Pass"
                    >
                        <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        disabled={isSigned}
                        onClick={() => onStatusChange('fail')}
                        className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all',
                            item.status === 'fail'
                                ? 'bg-red-500 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600',
                            isSigned && 'opacity-60 cursor-not-allowed'
                        )}
                        title="Mark as Fail"
                    >
                        <XCircle className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Label and badge */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-700">
                            {item.label}
                        </span>
                        <Badge
                            className={cn(
                                'text-[10px] font-black uppercase',
                                statusCfg.color
                            )}
                        >
                            {statusCfg.label}
                        </Badge>
                    </div>

                    {/* Notes toggle */}
                    <button
                        type="button"
                        className="mt-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors"
                        onClick={() => setNotesOpen((v) => !v)}
                    >
                        {notesOpen ? 'Hide notes' : item.notes ? 'View notes' : 'Add notes'}
                    </button>

                    {notesOpen && (
                        <textarea
                            rows={2}
                            value={localNotes}
                            disabled={isSigned}
                            onChange={(e) => setLocalNotes(e.target.value)}
                            onBlur={handleNotesBlur}
                            placeholder="Add notes for this item..."
                            className={cn(
                                'mt-2 w-full text-xs rounded-lg border border-slate-200 px-2.5 py-2 resize-none outline-none focus:border-slate-400 transition-colors',
                                isSigned && 'opacity-60 cursor-not-allowed bg-slate-50'
                            )}
                        />
                    )}

                    {/* Photo area (placeholder — wire to Supabase Storage if needed) */}
                    {!isSigned && (
                        <button
                            type="button"
                            className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-300 hover:text-slate-500 transition-colors"
                            onClick={() =>
                                toast.info('Photo upload coming soon.')
                            }
                        >
                            <Camera className="w-3 h-3" />
                            Attach photo
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupByCategory(
    items: InspectionItem[]
): { category: string; items: InspectionItem[] }[] {
    const map = new Map<string, InspectionItem[]>()
    for (const item of items) {
        const cat = item.category || 'general'
        if (!map.has(cat)) map.set(cat, [])
        map.get(cat)!.push(item)
    }
    return Array.from(map.entries()).map(([category, items]) => ({
        category,
        items,
    }))
}
