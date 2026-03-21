'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/services/activity-logger'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    CheckCircle,
    XCircle,
    ShieldCheck,
    AlertCircle,
    ArrowUpRight,
    Save,
    StickyNote,
    FileText,
    Loader2,
    Minus,
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccentColor } from '@/lib/hooks/useAccentColor'
import { useAuth } from '@/lib/hooks/useAuth'
import { VettingScoreCard } from '@/components/applications/VettingScoreCard'
import { runVetting } from '@/lib/vetting'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Property {
    id: string
    address: string
    unit_number?: string | null
    rent?: number | null
    bedrooms?: number | null
    bathrooms?: number | null
}

interface Application {
    id: string
    applicant_name: string
    status: string
    monthly_income?: number | null
    combined_household_income?: number | null
    credit_score?: number | null
    employer?: string | null
    background_check_passed?: boolean | null
    criminal_check_passed?: boolean | null
    public_records_clear?: boolean | null
    income_verified?: number | null
    government_id_verified?: boolean | null
    income_to_rent_ratio?: number | null
    yearly_rent_cost?: number | null
    dti_ratio?: number | null
    total_debt?: number | null
    employment_status?: string | null
    is_smoker?: boolean | null
    singlekey_report_url?: string | null
    additional_notes?: string | null
    denial_reason?: string | null
    reviewed_at?: string | null
    reviewed_by?: string | null
    created_at: string
    updated_at?: string | null
    company_id: string
    property?: Property | null
}

// ---------------------------------------------------------------------------
// Helper: derive yearly income from combined or monthly field
// ---------------------------------------------------------------------------
function getYearlyIncome(app: Application): number | null {
    if (app.combined_household_income && app.combined_household_income > 0) {
        // Combined household income is stored as a yearly figure
        return app.combined_household_income
    }
    if (app.monthly_income && app.monthly_income > 0) {
        return app.monthly_income * 12
    }
    return null
}

function getMonthlyIncome(app: Application): number | null {
    if (app.combined_household_income && app.combined_household_income > 0) {
        return app.combined_household_income / 12
    }
    if (app.monthly_income && app.monthly_income > 0) {
        return app.monthly_income
    }
    return null
}

// ---------------------------------------------------------------------------
// Helper: rent-to-income ratio as a percentage (annual rent / annual income)
// ---------------------------------------------------------------------------
function getRentToIncomeRatio(app: Application): number | null {
    const rent = app.property?.rent
    if (!rent || rent <= 0) return null
    const yearlyIncome = getYearlyIncome(app)
    if (!yearlyIncome || yearlyIncome <= 0) return null
    return (rent * 12) / yearlyIncome * 100
}

// ---------------------------------------------------------------------------
// Helper: credit score label
// ---------------------------------------------------------------------------
function creditLabel(score: number): string {
    if (score >= 800) return 'Exceptional'
    if (score >= 740) return 'Excellent'
    if (score >= 670) return 'Good'
    if (score >= 580) return 'Fair'
    return 'Poor'
}

function creditColors(score: number): { number: string; label: string; bg: string } {
    if (score >= 740) return { number: 'text-emerald-700', label: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' }
    if (score >= 670) return { number: 'text-blue-700', label: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' }
    if (score >= 580) return { number: 'text-amber-700', label: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' }
    return { number: 'text-rose-700', label: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' }
}

function rtiColors(ratio: number): { bar: string; text: string; bg: string } {
    if (ratio < 25) return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' }
    if (ratio <= 35) return { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' }
    return { bar: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50 border-rose-100' }
}

// ---------------------------------------------------------------------------
// Check indicator: green circle checkmark / red X / gray dash
// ---------------------------------------------------------------------------
type CheckState = boolean | null | undefined

function CheckIndicator({ value, label }: { value: CheckState; label: string }) {
    let icon: React.ReactNode
    let ringClass: string
    let bgClass: string

    if (value === true) {
        icon = <CheckCircle className="h-4 w-4 text-emerald-600" />
        ringClass = 'ring-emerald-200'
        bgClass = 'bg-emerald-50'
    } else if (value === false) {
        icon = <XCircle className="h-4 w-4 text-rose-600" />
        ringClass = 'ring-rose-200'
        bgClass = 'bg-rose-50'
    } else {
        icon = <Minus className="h-4 w-4 text-slate-400" />
        ringClass = 'ring-slate-200'
        bgClass = 'bg-slate-50'
    }

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className={cn('h-9 w-9 rounded-full flex items-center justify-center ring-2', bgClass, ringClass)}>
                {icon}
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center leading-tight max-w-[52px]">
                {label}
            </span>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Suggestion badge derived from vetting result
// ---------------------------------------------------------------------------
function SuggestionBadge({ app }: { app: Application }) {
    const rent = app.property?.rent ?? 0
    const vetting = runVetting(app, rent)

    if (vetting.overall === 'pass') {
        return (
            <Badge className="border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700">
                Recommended
            </Badge>
        )
    }
    if (vetting.overall === 'fail') {
        return (
            <Badge className="border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-xl bg-rose-50 text-rose-700">
                Not Recommended
            </Badge>
        )
    }
    return (
        <Badge className="border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-xl bg-amber-50 text-amber-700">
            Review Required
        </Badge>
    )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ApprovalsPage() {
    const router = useRouter()
    const supabase = createClient()
    const queryClient = useQueryClient()
    const { colors } = useAccentColor()
    const [denyDialog, setDenyDialog] = useState<{ open: boolean; applicationId: string | null }>({
        open: false,
        applicationId: null
    })
    const [denyReason, setDenyReason] = useState('')

    const { isLoading: authLoading, company } = useAuth()
    const resolvedCompanyId = company?.id

    // Fetch applications
    const { data: applications, isLoading, error } = useQuery({
        queryKey: ['pending-applications', resolvedCompanyId],
        queryFn: async () => {
            if (!resolvedCompanyId) return []

            const { data, error } = await supabase
                .from('applications')
                .select(`
                    *,
                    property:properties(
                        id,
                        address,
                        unit_number,
                        rent,
                        bedrooms,
                        bathrooms
                    )
                `)
                .eq('company_id', resolvedCompanyId)
                .order('created_at', { ascending: false })

            if (error) throw error
            return (data || []) as Application[]
        },
        enabled: !!resolvedCompanyId,
    })

    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: async (applicationId: string) => {
            const { data: { user } } = await supabase.auth.getUser()

            const { error } = await supabase
                .from('applications')
                .update({
                    status: 'approved',
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: user?.id
                })
                .eq('id', applicationId)
                .eq('company_id', resolvedCompanyId)

            if (error) throw error

            if (resolvedCompanyId) {
                await logActivity(supabase, {
                    companyId: resolvedCompanyId,
                    userId: user?.id || '',
                    action: 'approved',
                    entityType: 'application',
                    entityId: applicationId,
                    description: `Approved application: ${applicationId}`
                })
            }
        },
        onSuccess: () => {
            toast.success('Clearance granted successfully')
            queryClient.invalidateQueries({ queryKey: ['pending-applications', resolvedCompanyId] })
            queryClient.invalidateQueries({ queryKey: ['applications'] })
        },
        onError: (err: Error) => {
            toast.error('Failed to grant clearance', { description: err.message })
        }
    })

    // Deny mutation
    const denyMutation = useMutation({
        mutationFn: async ({ applicationId, reason }: { applicationId: string; reason: string }) => {
            const { data: { user } } = await supabase.auth.getUser()

            const { error } = await supabase
                .from('applications')
                .update({
                    status: 'denied',
                    denial_reason: reason,
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: user?.id
                })
                .eq('id', applicationId)
                .eq('company_id', resolvedCompanyId)

            if (error) throw error

            if (resolvedCompanyId) {
                await logActivity(supabase, {
                    companyId: resolvedCompanyId,
                    userId: user?.id || '',
                    action: 'denied',
                    entityType: 'application',
                    entityId: applicationId,
                    description: `Denied application: ${applicationId}`,
                    details: { reason }
                })
            }
        },
        onSuccess: () => {
            toast.success('Protocol rejected')
            queryClient.invalidateQueries({ queryKey: ['pending-applications', resolvedCompanyId] })
            queryClient.invalidateQueries({ queryKey: ['applications'] })
            setDenyDialog({ open: false, applicationId: null })
            setDenyReason('')
        },
        onError: (err: Error) => {
            toast.error('Failed to reject protocol', { description: err.message })
        }
    })

    // Update notes mutation
    const updateTermsMutation = useMutation({
        mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
            const { error } = await supabase
                .from('applications')
                .update({
                    additional_notes: notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('company_id', resolvedCompanyId)

            if (error) throw error
        },
        onSuccess: () => {
            toast.success('Case documentation updated')
            queryClient.invalidateQueries({ queryKey: ['pending-applications', resolvedCompanyId] })
        },
        onError: (err: Error) => {
            toast.error('Failed to update documentation', { description: err.message })
        }
    })

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <Loader2 className={cn("w-10 h-10 animate-spin", colors.text)} />
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

    if (isLoading) {
        return (
            <div className="p-10 space-y-10">
                <Skeleton className="h-10 w-48 rounded-xl" />
                <div className="space-y-6">
                    {[1, 2].map(i => (
                        <Skeleton key={i} className="h-64 w-full rounded-[2.5rem]" />
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-10 text-center">
                <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
                <h2 className="text-xl font-black text-slate-900 mb-2">Synchronization Failure</h2>
                <p className="text-slate-500 mb-6">{(error as Error).message}</p>
                <Button onClick={() => window.location.reload()}>Retry Handshake</Button>
            </div>
        )
    }

    return (
        <div className="relative p-6 lg:p-10 space-y-10">
            {/* Background decoration */}
            <div className={cn("absolute top-0 right-0 w-[40rem] h-[40rem] rounded-full blur-[120px] -z-10 animate-pulse-soft", colors.bgLight)} />

            {/* Page header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1", colors.text)}>
                        <ShieldCheck className="h-3 w-3" />
                        <span>Command Authorization</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Approvals</h1>
                    <p className="text-slate-500 font-medium">
                        High-priority protocols awaiting your final clearance ({applications?.length || 0} active review items)
                    </p>
                </div>
            </div>

            {!applications || applications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center bg-white/50 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className={cn("h-20 w-20 rounded-[2rem] flex items-center justify-center mb-6", colors.bgLight)}>
                        <ShieldCheck className={cn("h-10 w-10 opacity-20", colors.text)} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Operations Clear</h2>
                    <p className="text-slate-500 font-medium">No pending applications require immediate authorization.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    <AnimatePresence>
                        {applications.map((app, idx) => {
                            const monthlyIncome = getMonthlyIncome(app)
                            const yearlyIncome = getYearlyIncome(app)
                            const rtiRatio = getRentToIncomeRatio(app)
                            const rent = app.property?.rent ?? 0
                            const vetting = runVetting(app, rent)
                            const initials = app.applicant_name
                                .split(' ')
                                .slice(0, 2)
                                .map((n: string) => n[0]?.toUpperCase() ?? '')
                                .join('')

                            return (
                                <motion.div
                                    key={app.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                                >
                                    <Card className={cn(
                                        "group relative bg-white/80 backdrop-blur-xl rounded-[3rem] border-slate-100 shadow-xl shadow-slate-200/40 transition-all duration-500 overflow-hidden",
                                        colors.shadowHover
                                    )}>
                                        <CardContent className="p-8 lg:p-10">

                                            {/* -------------------------------------------------- */}
                                            {/* TOP: Applicant header                              */}
                                            {/* -------------------------------------------------- */}
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8">
                                                {/* Initials avatar */}
                                                <div className={cn(
                                                    "h-16 w-16 shrink-0 rounded-[1.5rem] flex items-center justify-center text-xl font-black transition-colors",
                                                    colors.bgLight, colors.text
                                                )}>
                                                    {initials || '?'}
                                                </div>

                                                {/* Name + badges */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight truncate">
                                                        {app.applicant_name}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        <Badge variant="outline" className="bg-white/90 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-xl text-slate-400">
                                                            #{app.id.slice(0, 8)}
                                                        </Badge>
                                                        <Badge className={cn(
                                                            "border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-xl capitalize",
                                                            colors.bgLight, colors.text
                                                        )}>
                                                            {(app.status || 'new').replace('_', ' ')}
                                                        </Badge>
                                                        <SuggestionBadge app={app} />
                                                    </div>
                                                </div>

                                                {/* Property address */}
                                                {app.property && (
                                                    <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100 shrink-0">
                                                        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", colors.bgLight)}>
                                                            <ArrowUpRight className={cn("h-4 w-4", colors.text)} />
                                                        </div>
                                                        <div>
                                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Property</div>
                                                            <div className="text-sm font-black text-slate-700 leading-tight">
                                                                {app.property.address}
                                                                {app.property.unit_number && (
                                                                    <span className="text-slate-400"> #{app.property.unit_number}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* -------------------------------------------------- */}
                                            {/* METRICS ROW                                        */}
                                            {/* -------------------------------------------------- */}
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

                                                {/* Rent-to-Income Ratio */}
                                                <div className={cn(
                                                    "rounded-2xl border p-4 space-y-1",
                                                    rtiRatio !== null
                                                        ? rtiColors(rtiRatio).bg
                                                        : "bg-slate-50 border-slate-100"
                                                )}>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        Rent-to-Income
                                                    </div>
                                                    {rtiRatio !== null ? (
                                                        <>
                                                            <div className={cn("text-3xl font-black tabular-nums", rtiColors(rtiRatio).text)}>
                                                                {rtiRatio.toFixed(0)}%
                                                            </div>
                                                            <div className="text-[10px] font-bold text-slate-400">
                                                                {rtiRatio < 25 ? 'Excellent ratio' : rtiRatio <= 35 ? 'Acceptable ratio' : 'High ratio'}
                                                            </div>
                                                            {/* Mini progress bar */}
                                                            <div className="h-1 w-full bg-white/60 rounded-full mt-2 overflow-hidden">
                                                                <div
                                                                    className={cn("h-full rounded-full transition-all duration-700", rtiColors(rtiRatio).bar)}
                                                                    style={{ width: `${Math.min(100, rtiRatio)}%` }}
                                                                />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-2xl font-black text-slate-300">--</div>
                                                    )}
                                                </div>

                                                {/* Combined Household Income */}
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-1">
                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        Household Income
                                                    </div>
                                                    {monthlyIncome !== null ? (
                                                        <>
                                                            <div className="text-2xl font-black text-slate-800 tabular-nums">
                                                                ${monthlyIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                <span className="text-sm font-bold text-slate-400">/mo</span>
                                                            </div>
                                                            <div className="text-[10px] font-bold text-slate-400 tabular-nums">
                                                                ${yearlyIncome?.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-2xl font-black text-slate-300">--</div>
                                                    )}
                                                </div>

                                                {/* Credit Score */}
                                                {app.credit_score !== null && app.credit_score !== undefined ? (
                                                    <div className={cn(
                                                        "rounded-2xl border p-4 space-y-1",
                                                        creditColors(app.credit_score).bg
                                                    )}>
                                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                            Credit Score
                                                        </div>
                                                        <div className={cn("text-3xl font-black tabular-nums", creditColors(app.credit_score).number)}>
                                                            {app.credit_score}
                                                        </div>
                                                        <div className={cn("text-[10px] font-bold", creditColors(app.credit_score).label)}>
                                                            {creditLabel(app.credit_score)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-1">
                                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                            Credit Score
                                                        </div>
                                                        <div className="text-2xl font-black text-slate-300">Pending</div>
                                                    </div>
                                                )}

                                                {/* Vetting Score */}
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-1">
                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        Vetting Score
                                                    </div>
                                                    <div className={cn(
                                                        "text-3xl font-black tabular-nums",
                                                        vetting.score >= 70
                                                            ? 'text-emerald-700'
                                                            : vetting.score >= 50
                                                            ? 'text-amber-700'
                                                            : 'text-rose-700'
                                                    )}>
                                                        {vetting.score}
                                                        <span className="text-sm font-bold text-slate-400">/100</span>
                                                    </div>
                                                    <div className={cn(
                                                        "text-[10px] font-bold",
                                                        vetting.overall === 'pass'
                                                            ? 'text-emerald-600'
                                                            : vetting.overall === 'fail'
                                                            ? 'text-rose-600'
                                                            : 'text-amber-600'
                                                    )}>
                                                        {vetting.overall === 'pass' ? 'Passes screening' : vetting.overall === 'fail' ? 'Fails screening' : 'Needs review'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* -------------------------------------------------- */}
                                            {/* CHECK INDICATORS ROW                               */}
                                            {/* -------------------------------------------------- */}
                                            <div className="flex flex-wrap items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 mb-6">
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest w-full mb-1">
                                                    Verification Checks
                                                </div>
                                                <CheckIndicator value={app.criminal_check_passed} label="Criminal" />
                                                <CheckIndicator value={app.background_check_passed} label="Background" />
                                                <CheckIndicator value={app.public_records_clear} label="Public Records" />
                                                <CheckIndicator
                                                    value={
                                                        app.income_verified !== null && app.income_verified !== undefined
                                                            ? app.income_verified > 0
                                                            : null
                                                    }
                                                    label="Income Verified"
                                                />
                                                <CheckIndicator value={app.government_id_verified} label="ID Verified" />
                                            </div>

                                            {/* -------------------------------------------------- */}
                                            {/* VETTING SCORE CARD (detailed breakdown)            */}
                                            {/* -------------------------------------------------- */}
                                            <div className="mb-6">
                                                <VettingScoreCard
                                                    application={app}
                                                    propertyRent={rent}
                                                />
                                            </div>

                                            {/* -------------------------------------------------- */}
                                            {/* ACTIONS + CASE NOTES                               */}
                                            {/* -------------------------------------------------- */}
                                            <div className="flex flex-col lg:flex-row gap-6 pt-6 border-t border-slate-100">

                                                {/* Action buttons */}
                                                <div className="flex flex-row lg:flex-col gap-3 lg:w-52 shrink-0">
                                                    <Button
                                                        onClick={() => approveMutation.mutate(app.id)}
                                                        disabled={approveMutation.isPending || app.status === 'approved'}
                                                        className={cn(
                                                            "flex-1 lg:flex-none h-14 text-white rounded-2xl shadow-lg font-black transition-all hover:scale-[1.02] active:scale-[0.98]",
                                                            app.status === 'approved'
                                                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-none cursor-not-allowed"
                                                                : cn(colors.bg, colors.shadow)
                                                        )}
                                                    >
                                                        <CheckCircle className="h-5 w-5 mr-2" />
                                                        {app.status === 'approved' ? 'Approved' : 'Approve'}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setDenyDialog({ open: true, applicationId: app.id })}
                                                        disabled={denyMutation.isPending || app.status === 'denied'}
                                                        className={cn(
                                                            "flex-1 lg:flex-none h-14 rounded-2xl font-black transition-all hover:scale-[1.02]",
                                                            app.status === 'denied'
                                                                ? "border-rose-100 bg-rose-50 text-rose-600 shadow-none cursor-not-allowed"
                                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        <XCircle className="h-5 w-5 mr-2" />
                                                        {app.status === 'denied' ? 'Rejected' : 'Reject'}
                                                    </Button>

                                                    {app.status === 'approved' && (
                                                        <div className="pt-2 border-t border-slate-100 space-y-2">
                                                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                <FileText className="h-3 w-3" />
                                                                Next Step
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                className="w-full justify-start h-11 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 font-bold px-3 text-sm"
                                                                onClick={() => router.push(`/documents?type=lease_proposal&applicationId=${app.id}`)}
                                                            >
                                                                <ArrowUpRight className="h-4 w-4 mr-2" />
                                                                Draft Lease
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Case documentation */}
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", colors.bgLight)}>
                                                                <StickyNote className={cn("h-4 w-4", colors.text)} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-base font-black text-slate-900 tracking-tight">Case Documentation</h4>
                                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Internal Agent Notes</p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                const el = document.getElementById(`notes-${app.id}`) as HTMLTextAreaElement
                                                                updateTermsMutation.mutate({ id: app.id, notes: el.value })
                                                            }}
                                                            disabled={updateTermsMutation.isPending}
                                                            className={cn("rounded-xl font-bold px-5 text-white", colors.bg)}
                                                        >
                                                            <Save className="h-4 w-4 mr-2" />
                                                            Save
                                                        </Button>
                                                    </div>
                                                    <Textarea
                                                        id={`notes-${app.id}`}
                                                        defaultValue={app.additional_notes || ''}
                                                        placeholder="Enter final negotiation details, security deposit arrangements, or move-in contingencies..."
                                                        className="min-h-[110px] bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-2xl p-5 text-slate-600 font-medium text-sm leading-relaxed transition-all"
                                                    />
                                                </div>
                                            </div>

                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Deny dialog */}
            <Dialog open={denyDialog.open} onOpenChange={(open) => setDenyDialog({ open, applicationId: null })}>
                <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none bg-white shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900">Protocol Rejection</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            Mandatory requirement: Specify the reasoning for denying this clearance.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Detail the non-compliance or failure points..."
                        value={denyReason}
                        onChange={(e) => setDenyReason(e.target.value)}
                        className="min-h-32 bg-slate-50 border-transparent focus:bg-white focus:border-rose-400 rounded-2xl p-4 font-medium transition-all"
                    />
                    <DialogFooter className="mt-6 flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setDenyDialog({ open: false, applicationId: null })}
                            className="rounded-xl font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (denyDialog.applicationId) {
                                    denyMutation.mutate({
                                        applicationId: denyDialog.applicationId,
                                        reason: denyReason
                                    })
                                }
                            }}
                            disabled={denyMutation.isPending || !denyReason.trim()}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-8 font-black"
                        >
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
