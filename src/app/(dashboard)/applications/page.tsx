'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useDeleteApplication } from '@/lib/hooks/useApplications'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    User,
    Building2,
    Mail,
    Phone,
    DollarSign,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    RefreshCw,
    ClipboardList,
    Shield,
    Trash2,
    Edit,
    Loader2,
    TrendingUp,
    CreditCard,
    Users,
    ArrowRight,
    Check,
    X,
    Minus,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAccentColor } from '@/lib/hooks/useAccentColor'
import { EditApplicationModal } from '@/components/applications/EditApplicationModal'
import { useAuth } from '@/lib/hooks/useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyJoin {
    id: string
    address: string
    unit_number: string | null
    rent: number | null
}

interface Application {
    id: string
    applicant_name: string
    applicant_email: string
    applicant_phone: string | null
    monthly_income: number | null
    credit_score: number | null
    status: string
    move_in_date: string | null
    created_at: string
    updated_at: string
    company_id: string
    property_id: string | null
    criminal_check_status: string | null
    background_check_status: string | null
    income_verified: boolean | null
    id_verified: boolean | null
    notes: string | null
    property: PropertyJoin | PropertyJoin[] | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProperty(app: Application): PropertyJoin | null {
    if (!app.property) return null
    return Array.isArray(app.property) ? app.property[0] ?? null : app.property
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value)
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0] ?? '')
        .slice(0, 2)
        .join('')
        .toUpperCase()
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
    string,
    { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
    new: {
        label: 'New',
        className: 'bg-blue-50 text-blue-700 border-blue-100',
        icon: Clock,
    },
    submitted: {
        label: 'Submitted',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        icon: Clock,
    },
    screening: {
        label: 'Screening',
        className: 'bg-amber-50 text-amber-700 border-amber-100',
        icon: Shield,
    },
    pending_landlord: {
        label: 'Pending Review',
        className: 'bg-purple-50 text-purple-700 border-purple-100',
        icon: User,
    },
    approved: {
        label: 'Approved',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        icon: CheckCircle,
    },
    denied: {
        label: 'Denied',
        className: 'bg-rose-50 text-rose-700 border-rose-100',
        icon: XCircle,
    },
}

function getStatusConfig(status: string) {
    return STATUS_CONFIG[status] ?? STATUS_CONFIG['new']
}

// ─── Check Indicator ──────────────────────────────────────────────────────────

type CheckState = 'pass' | 'fail' | 'pending'

function resolveCheckState(value: string | boolean | null | undefined): CheckState {
    if (value === null || value === undefined) return 'pending'
    if (typeof value === 'boolean') return value ? 'pass' : 'fail'
    const lower = String(value).toLowerCase()
    if (lower === 'clear' || lower === 'passed' || lower === 'pass' || lower === 'true') return 'pass'
    if (lower === 'failed' || lower === 'fail' || lower === 'flagged' || lower === 'false') return 'fail'
    return 'pending'
}

function CheckIndicator({
    label,
    state,
}: {
    label: string
    state: CheckState
}) {
    const configs = {
        pass: {
            ring: 'bg-emerald-100 border-emerald-200',
            icon: <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />,
            text: 'text-emerald-700',
        },
        fail: {
            ring: 'bg-rose-100 border-rose-200',
            icon: <X className="h-3 w-3 text-rose-600 stroke-[3]" />,
            text: 'text-rose-700',
        },
        pending: {
            ring: 'bg-slate-100 border-slate-200',
            icon: <Minus className="h-3 w-3 text-slate-400 stroke-[3]" />,
            text: 'text-slate-400',
        },
    }

    const cfg = configs[state]

    return (
        <div className="flex flex-col items-center gap-1 min-w-[52px]">
            <div
                className={cn(
                    'h-8 w-8 rounded-full border flex items-center justify-center',
                    cfg.ring
                )}
            >
                {cfg.icon}
            </div>
            <span className={cn('text-[9px] font-bold uppercase tracking-wide text-center leading-tight', cfg.text)}>
                {label}
            </span>
        </div>
    )
}

// ─── Metric Cell ──────────────────────────────────────────────────────────────

function MetricCell({
    label,
    value,
    valueClassName,
    sub,
}: {
    label: string
    value: string
    valueClassName?: string
    sub?: string
}) {
    return (
        <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 truncate">
                {label}
            </span>
            <span className={cn('text-base font-black leading-none', valueClassName ?? 'text-slate-900')}>
                {value}
            </span>
            {sub && (
                <span className="text-[10px] font-medium text-slate-400 truncate">{sub}</span>
            )}
        </div>
    )
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ applications }: { applications: Application[] }) {
    const total = applications.length
    const approved = applications.filter((a) => a.status === 'approved').length
    const pending = applications.filter(
        (a) => !['approved', 'denied'].includes(a.status)
    ).length
    const scores = applications
        .map((a) => a.credit_score)
        .filter((s): s is number => typeof s === 'number' && s > 0)
    const avgCredit =
        scores.length > 0
            ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
            : null

    const stats = [
        {
            label: 'Total Applications',
            value: String(total),
            icon: Users,
            className: 'text-slate-900',
            bg: 'bg-slate-50',
            iconColor: 'text-slate-400',
        },
        {
            label: 'Approved',
            value: String(approved),
            icon: CheckCircle,
            className: 'text-emerald-700',
            bg: 'bg-emerald-50',
            iconColor: 'text-emerald-500',
        },
        {
            label: 'Pending Review',
            value: String(pending),
            icon: Clock,
            className: 'text-amber-700',
            bg: 'bg-amber-50',
            iconColor: 'text-amber-500',
        },
        {
            label: 'Avg Credit Score',
            value: avgCredit !== null ? String(avgCredit) : '—',
            icon: CreditCard,
            className:
                avgCredit === null
                    ? 'text-slate-400'
                    : avgCredit >= 700
                    ? 'text-emerald-700'
                    : avgCredit >= 600
                    ? 'text-amber-700'
                    : 'text-rose-700',
            bg:
                avgCredit === null
                    ? 'bg-slate-50'
                    : avgCredit >= 700
                    ? 'bg-emerald-50'
                    : avgCredit >= 600
                    ? 'bg-amber-50'
                    : 'bg-rose-50',
            iconColor:
                avgCredit === null
                    ? 'text-slate-300'
                    : avgCredit >= 700
                    ? 'text-emerald-400'
                    : avgCredit >= 600
                    ? 'text-amber-400'
                    : 'text-rose-400',
        },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
                const Icon = stat.icon
                return (
                    <div
                        key={stat.label}
                        className={cn(
                            'flex items-center gap-4 px-5 py-4 rounded-2xl border border-slate-100',
                            stat.bg
                        )}
                    >
                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                            <Icon className={cn('h-5 w-5', stat.iconColor)} />
                        </div>
                        <div>
                            <div className={cn('text-2xl font-black leading-none', stat.className)}>
                                {stat.value}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                                {stat.label}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ─── Application Card ─────────────────────────────────────────────────────────

function ApplicationCard({
    application,
    onApprove,
    onDeny,
    onDelete,
    isUpdating,
}: {
    application: Application
    onApprove: () => void
    onDeny: () => void
    onDelete: () => void
    isUpdating: boolean
}) {
    const [showEditModal, setShowEditModal] = useState(false)

    const statusCfg = getStatusConfig(application.status)
    const StatusIcon = statusCfg.icon

    const property = getProperty(application)
    const rent = property?.rent ?? null
    const monthlyIncome = application.monthly_income ?? null

    // Income-to-rent ratio: monthly income / monthly rent
    const incomeToRentRatio =
        rent && rent > 0 && monthlyIncome !== null && monthlyIncome > 0
            ? monthlyIncome / rent
            : null

    const yearlyRentCost = rent !== null ? rent * 12 : null

    const ratioColor =
        incomeToRentRatio === null
            ? 'text-slate-400'
            : incomeToRentRatio >= 3
            ? 'text-emerald-600'
            : incomeToRentRatio >= 2
            ? 'text-amber-600'
            : 'text-rose-600'

    const creditColor =
        application.credit_score === null
            ? 'text-slate-400'
            : application.credit_score >= 700
            ? 'text-emerald-600'
            : application.credit_score >= 600
            ? 'text-amber-600'
            : 'text-rose-600'

    const initials = getInitials(application.applicant_name ?? '?')

    const avatarColors = [
        'bg-indigo-100 text-indigo-700',
        'bg-violet-100 text-violet-700',
        'bg-sky-100 text-sky-700',
        'bg-teal-100 text-teal-700',
        'bg-amber-100 text-amber-700',
    ]
    // Deterministic color pick based on name length
    const avatarColor = avatarColors[(application.applicant_name?.length ?? 0) % avatarColors.length]

    const criminalState = resolveCheckState(application.criminal_check_status)
    const backgroundState = resolveCheckState(application.background_check_status)
    const incomeState = resolveCheckState(application.income_verified)
    const idState = resolveCheckState(application.id_verified)

    return (
        <>
            <Card className="group bg-white/90 backdrop-blur-md border border-slate-100 rounded-2xl shadow-md shadow-slate-200/40 hover:shadow-xl hover:shadow-indigo-500/8 hover:border-indigo-100 transition-all duration-300 overflow-hidden">
                <CardContent className="p-0">
                    <div className="flex flex-col xl:flex-row xl:items-stretch divide-y xl:divide-y-0 xl:divide-x divide-slate-100">

                        {/* ── LEFT: Applicant Info ─────────────────────── */}
                        <div className="flex items-center gap-4 px-5 py-4 xl:w-56 shrink-0">
                            {/* Avatar */}
                            <div
                                className={cn(
                                    'h-11 w-11 rounded-full flex items-center justify-center text-sm font-black shrink-0 select-none',
                                    avatarColor
                                )}
                            >
                                {initials}
                            </div>
                            {/* Name + status + contact */}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-slate-900 truncate leading-tight">
                                    {application.applicant_name}
                                </p>
                                <div
                                    className={cn(
                                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest mt-1',
                                        statusCfg.className
                                    )}
                                >
                                    <StatusIcon className="h-2.5 w-2.5" />
                                    {statusCfg.label}
                                </div>
                                {application.applicant_email && (
                                    <p className="text-[10px] text-slate-400 font-medium truncate mt-1 flex items-center gap-1">
                                        <Mail className="h-2.5 w-2.5 shrink-0" />
                                        {application.applicant_email}
                                    </p>
                                )}
                                {application.applicant_phone && (
                                    <p className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
                                        <Phone className="h-2.5 w-2.5 shrink-0" />
                                        {application.applicant_phone}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* ── CENTER: Key Metrics ──────────────────────── */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 flex-1 bg-slate-50/40">
                            {/* Income-to-Rent Ratio */}
                            <div className="flex flex-col gap-0.5 min-w-[64px]">
                                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-1">
                                    <TrendingUp className="h-2.5 w-2.5" />
                                    Income Ratio
                                </span>
                                <span className={cn('text-xl font-black leading-none', ratioColor)}>
                                    {incomeToRentRatio !== null
                                        ? `${incomeToRentRatio.toFixed(1)}x`
                                        : '—'}
                                </span>
                                <span className="text-[9px] font-medium text-slate-400">
                                    {incomeToRentRatio !== null
                                        ? incomeToRentRatio >= 3
                                            ? 'Strong'
                                            : incomeToRentRatio >= 2
                                            ? 'Marginal'
                                            : 'Weak'
                                        : 'No data'}
                                </span>
                            </div>

                            {/* Combined Income */}
                            <MetricCell
                                label="Monthly Income"
                                value={
                                    monthlyIncome !== null
                                        ? formatCurrency(monthlyIncome)
                                        : '—'
                                }
                                sub={
                                    monthlyIncome !== null
                                        ? `${formatCurrency(monthlyIncome * 12)}/yr`
                                        : undefined
                                }
                            />

                            {/* Credit Score */}
                            <div className="flex flex-col gap-0.5 min-w-[56px]">
                                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-1">
                                    <CreditCard className="h-2.5 w-2.5" />
                                    Credit
                                </span>
                                <span className={cn('text-xl font-black leading-none', creditColor)}>
                                    {application.credit_score ?? '—'}
                                </span>
                                <span className="text-[9px] font-medium text-slate-400">
                                    {application.credit_score !== null
                                        ? application.credit_score >= 700
                                            ? 'Excellent'
                                            : application.credit_score >= 600
                                            ? 'Fair'
                                            : 'Poor'
                                        : 'No data'}
                                </span>
                            </div>

                            {/* Yearly Rent Cost */}
                            <MetricCell
                                label="Yearly Rent"
                                value={yearlyRentCost !== null ? formatCurrency(yearlyRentCost) : '—'}
                                sub={
                                    rent !== null
                                        ? `${formatCurrency(rent)}/mo`
                                        : undefined
                                }
                            />

                            {/* Property */}
                            {property && (
                                <div className="flex flex-col gap-0.5 min-w-0 max-w-[160px]">
                                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-1">
                                        <Building2 className="h-2.5 w-2.5" />
                                        Property
                                    </span>
                                    <span className="text-xs font-bold text-slate-700 truncate">
                                        {property.address}
                                    </span>
                                    {property.unit_number && (
                                        <span className="text-[10px] font-medium text-slate-400">
                                            Unit {property.unit_number}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── RIGHT: Check Indicators ──────────────────── */}
                        <div className="flex items-center justify-center gap-3 px-5 py-4 shrink-0 bg-white/60">
                            <CheckIndicator label="Criminal" state={criminalState} />
                            <CheckIndicator label="Background" state={backgroundState} />
                            <CheckIndicator label="Income" state={incomeState} />
                            <CheckIndicator label="ID" state={idState} />
                        </div>

                        {/* ── FAR RIGHT: Actions ───────────────────────── */}
                        <div className="flex xl:flex-col items-center justify-end gap-2 px-4 py-4 shrink-0 bg-white/80">
                            <Button
                                asChild
                                size="sm"
                                className="h-8 px-3 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold gap-1.5"
                            >
                                <Link href={`/applications/${application.id}`}>
                                    <ArrowRight className="h-3 w-3" />
                                    <span className="hidden sm:inline">View</span>
                                </Link>
                            </Button>

                            <Button
                                size="sm"
                                onClick={() => setShowEditModal(true)}
                                variant="outline"
                                className="h-8 px-3 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-[11px] font-bold gap-1.5"
                            >
                                <Edit className="h-3 w-3" />
                                <span className="hidden sm:inline">Edit</span>
                            </Button>

                            <Button
                                size="sm"
                                onClick={onApprove}
                                disabled={isUpdating || application.status === 'approved'}
                                className={cn(
                                    'h-8 px-3 rounded-lg text-[11px] font-bold gap-1.5',
                                    application.status === 'approved'
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                )}
                            >
                                <CheckCircle className="h-3 w-3" />
                                <span className="hidden sm:inline">
                                    {application.status === 'approved' ? 'Approved' : 'Approve'}
                                </span>
                            </Button>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onDeny}
                                disabled={isUpdating || application.status === 'denied'}
                                className={cn(
                                    'h-8 px-3 rounded-lg text-[11px] font-bold gap-1.5',
                                    application.status === 'denied'
                                        ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                                        : 'border-rose-100 text-rose-600 hover:bg-rose-50'
                                )}
                            >
                                <XCircle className="h-3 w-3" />
                                <span className="hidden sm:inline">
                                    {application.status === 'denied' ? 'Denied' : 'Reject'}
                                </span>
                            </Button>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onDelete}
                                className="h-8 px-3 border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-lg text-[11px] font-bold gap-1.5 group/del"
                            >
                                <Trash2 className="h-3 w-3 group-hover/del:text-rose-600" />
                                <span className="hidden sm:inline">Delete</span>
                            </Button>
                        </div>
                    </div>

                    {/* Applied timestamp strip */}
                    <div className="px-5 py-1.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-medium">
                            Applied{' '}
                            {application.created_at
                                ? formatDistanceToNow(new Date(application.created_at), {
                                      addSuffix: true,
                                  })
                                : '—'}
                        </span>
                        {application.property_id && (
                            <span className="text-[10px] text-slate-400 font-medium">
                                ID: {application.id.slice(0, 8).toUpperCase()}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            <EditApplicationModal
                application={application}
                open={showEditModal}
                onOpenChange={setShowEditModal}
            />
        </>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const { isLoading: authLoading, company } = useAuth()
    const resolvedCompanyId = company?.id
    const { colors } = useAccentColor()
    const { mutate: deleteApplication } = useDeleteApplication()
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    // Fetch applications with security filter
    const {
        data: applications,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['applications', statusFilter, resolvedCompanyId],
        queryFn: async () => {
            if (!resolvedCompanyId) return []

            let query = supabase
                .from('applications')
                .select(`
                    *,
                    property:properties(id, address, unit_number, rent)
                `)
                .eq('company_id', resolvedCompanyId)
                .order('created_at', { ascending: false })

            if (statusFilter && statusFilter !== 'all') {
                query = query.eq('status', statusFilter)
            }

            const { data, error: queryError } = await query
            if (queryError) throw queryError
            return (data ?? []) as Application[]
        },
        enabled: !!resolvedCompanyId,
        retry: 3,
        staleTime: 60 * 1000,
    })

    // Update status mutation
    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { data, error: mutErr } = await supabase
                .from('applications')
                .update({
                    status,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .eq('company_id', resolvedCompanyId) // Security
                .select()
                .single()

            if (mutErr) throw mutErr
            return data
        },
        onSuccess: () => {
            toast.success('Application updated successfully')
            queryClient.invalidateQueries({ queryKey: ['applications'] })
        },
        onError: (err: unknown) => {
            toast.error('Failed to update application', {
                description: (err as Error).message,
            })
        },
    })

    const filteredApplications = applications?.filter((app) => {
        if (!searchTerm) return true
        const search = searchTerm.toLowerCase()
        const applicantName = app.applicant_name?.toLowerCase() ?? ''
        const applicantEmail = app.applicant_email?.toLowerCase() ?? ''
        const property = getProperty(app)
        const address = property?.address?.toLowerCase() ?? ''
        return (
            applicantName.includes(search) ||
            applicantEmail.includes(search) ||
            address.includes(search)
        )
    })

    // ── Auth loading ──────────────────────────────────────────────────────────
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
                <p className="text-slate-500 font-medium">Unable to load workspace data.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                    Refresh Page
                </button>
            </div>
        )
    }

    // ── Query loading ─────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="p-6 lg:p-10 space-y-6">
                <div className="space-y-3">
                    <Skeleton className="h-10 w-48 rounded-xl" />
                    <Skeleton className="h-4 w-72 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-16 w-full rounded-2xl" />
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                    ))}
                </div>
            </div>
        )
    }

    // ── Error ─────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="p-10 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="h-20 w-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mb-6">
                    <AlertTriangle className="h-10 w-10 text-rose-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Unable to Load Applications</h2>
                <p className="text-slate-500 font-medium mb-8 max-w-md">
                    {(error as Error).message}
                </p>
                <Button
                    onClick={() => refetch()}
                    className="bg-slate-900 text-white rounded-xl"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        )
    }

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <div className="relative p-6 lg:p-10 space-y-8">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-[40rem] h-[40rem] bg-indigo-50/50 rounded-full blur-[120px] -z-10 pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div
                        className={cn(
                            'flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1',
                            colors.text
                        )}
                    >
                        <ClipboardList className="h-3 w-3" />
                        <span>Tenant Applications</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">
                        Applications
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Compare applicants side-by-side ({filteredApplications?.length ?? 0} shown)
                    </p>
                </div>
                <Button
                    asChild
                    className={cn(
                        'h-12 px-6 rounded-2xl text-white font-bold shadow-lg transition-all hover:-translate-y-0.5',
                        colors.bg,
                        colors.shadow
                    )}
                >
                    <Link href="/applications/new">
                        <User className="h-4 w-4 mr-2" />
                        Add Application
                    </Link>
                </Button>
            </div>

            {/* Summary Stats Bar */}
            {applications && applications.length > 0 && (
                <StatsBar applications={applications} />
            )}

            {/* Filters */}
            <Card className="bg-white/80 backdrop-blur-xl border-slate-100 rounded-2xl shadow-md shadow-slate-200/40 p-5">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search
                            className={cn(
                                'absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors',
                                `group-focus-within:${colors.text}`
                            )}
                        />
                        <Input
                            placeholder="Search by name, email, or property..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={cn(
                                'h-12 pl-12 bg-slate-50 border-transparent focus:bg-white transition-all rounded-xl font-medium',
                                `focus:${colors.border}`
                            )}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-12 w-full sm:w-56 bg-slate-50 border-transparent text-slate-600 font-bold rounded-xl">
                            <Filter className="h-4 w-4 mr-3 opacity-50" />
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                            <SelectItem value="all">All Applications</SelectItem>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="screening">Screening</SelectItem>
                            <SelectItem value="pending_landlord">Pending Review</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="denied">Denied</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Application Cards List */}
            {!filteredApplications || filteredApplications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center bg-white/50 backdrop-blur-md rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                        <User className="h-8 w-8 text-slate-200" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">No applications found</h3>
                    <p className="text-slate-500 font-medium mt-2 max-w-sm">
                        {searchTerm || statusFilter !== 'all'
                            ? 'Try adjusting your search or filter.'
                            : 'Applications will appear here when tenants apply or you add them manually.'}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <AnimatePresence>
                        {filteredApplications.map((app, idx) => (
                            <motion.div
                                key={app.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25, delay: idx * 0.04 }}
                            >
                                <ApplicationCard
                                    application={app}
                                    onApprove={() =>
                                        updateStatus.mutate({ id: app.id, status: 'approved' })
                                    }
                                    onDeny={() =>
                                        updateStatus.mutate({ id: app.id, status: 'denied' })
                                    }
                                    onDelete={() => {
                                        if (
                                            confirm(
                                                'Are you sure you want to delete this application?'
                                            )
                                        ) {
                                            deleteApplication(app.id)
                                        }
                                    }}
                                    isUpdating={updateStatus.isPending}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}
