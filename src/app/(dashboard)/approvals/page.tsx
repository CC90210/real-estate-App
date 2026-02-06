'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useCompanyId } from '@/lib/hooks/useCompanyId'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    CheckCircle,
    XCircle,
    User,
    Building2,
    DollarSign,
    Briefcase,
    Phone,
    Mail,
    ShieldCheck,
    AlertCircle,
    ArrowUpRight,
    Search,
    MessageSquare,
    Save,
    StickyNote,
    FileText
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

export default function ApprovalsPage() {
    const router = useRouter()
    const supabase = createClient()
    const queryClient = useQueryClient()
    const { companyId, isLoading: isCompanyLoading } = useCompanyId()
    const { colors } = useAccentColor()
    const [denyDialog, setDenyDialog] = useState<{ open: boolean; applicationId: string | null }>({
        open: false,
        applicationId: null
    })
    const [denyReason, setDenyReason] = useState('')

    // Fetch applications
    const { data: applications, isLoading, error } = useQuery({
        queryKey: ['pending-applications', companyId],
        queryFn: async () => {
            if (!companyId) return []

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
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data || []
        },
        enabled: !!companyId,
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
                .eq('company_id', companyId)

            if (error) throw error

            // Log activity
            if (companyId) {
                await supabase.from('activity_log').insert({
                    company_id: companyId,
                    user_id: user?.id,
                    action: 'approved',
                    entity_type: 'application',
                    entity_id: applicationId
                })
            }
        },
        onSuccess: () => {
            toast.success('Clearance granted successfully')
            queryClient.invalidateQueries({ queryKey: ['pending-applications'] })
            queryClient.invalidateQueries({ queryKey: ['applications'] })
        },
        onError: (err: any) => {
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
                .eq('company_id', companyId)

            if (error) throw error

            // Log activity
            if (companyId) {
                await supabase.from('activity_log').insert({
                    company_id: companyId,
                    user_id: user?.id,
                    action: 'denied',
                    entity_type: 'application',
                    entity_id: applicationId,
                    details: { reason }
                })
            }
        },
        onSuccess: () => {
            toast.success('Protocol rejected')
            queryClient.invalidateQueries({ queryKey: ['pending-applications'] })
            queryClient.invalidateQueries({ queryKey: ['applications'] })
            setDenyDialog({ open: false, applicationId: null })
            setDenyReason('')
        },
        onError: (err: any) => {
            toast.error('Failed to reject protocol', { description: err.message })
        }
    })

    // Update terms mutation
    const updateTermsMutation = useMutation({
        mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
            const { error } = await supabase
                .from('applications')
                .update({
                    additional_notes: notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('company_id', companyId)

            if (error) throw error
        },
        onSuccess: () => {
            toast.success('Case documentation updated')
            queryClient.invalidateQueries({ queryKey: ['pending-applications'] })
        },
        onError: (err: any) => {
            toast.error('Failed to update documentation', { description: err.message })
        }
    })

    if (isLoading || isCompanyLoading) {
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
            {/* Decoration */}
            <div className={cn("absolute top-0 right-0 w-[40rem] h-[40rem] rounded-full blur-[120px] -z-10 animate-pulse-soft", colors.bgLight)} />

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
                <div className={cn("flex flex-col items-center justify-center p-20 text-center bg-white/50 backdrop-blur-md rounded-[3rem] border-2 border-dashed", colors.border.replace('blue', 'transparent').replace('indigo', 'transparent').replace('emerald', 'transparent').replace('rose', 'transparent').replace('slate', 'transparent') || colors.border)}>
                    <div className={cn("h-20 w-20 rounded-[2rem] flex items-center justify-center mb-6", colors.bgLight)}>
                        <ShieldCheck className={cn("h-10 w-10 opacity-20", colors.text)} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Operations Clear</h2>
                    <p className="text-slate-500 font-medium">No pending applications require immediate authorization.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    <AnimatePresence>
                        {applications.map((app, idx) => (
                            <motion.div
                                key={app.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: idx * 0.1 }}
                            >
                                <Card className={cn("group relative bg-white/80 backdrop-blur-xl rounded-[3rem] border-slate-100 shadow-xl shadow-slate-200/40 transition-all duration-500 overflow-hidden", colors.shadowHover)}>
                                    <CardContent className="p-10">
                                        <div className="flex flex-col lg:flex-row gap-10">
                                            {/* Left: Applicant Signature */}
                                            <div className="flex-1 space-y-8">
                                                <div className="flex items-center gap-6">
                                                    <div className={cn("h-20 w-20 bg-slate-50 rounded-[2rem] flex items-center justify-center transition-colors", `group-hover:${colors.bgLight}`)}>
                                                        <User className={cn("h-10 w-10 text-slate-200 transition-colors", `group-hover:${colors.text}`)} />
                                                    </div>
                                                    <div>
                                                        <h3 className={cn("text-3xl font-black text-slate-900 tracking-tight transition-colors", `group-hover:${colors.text}`)}>
                                                            {app.applicant_name}
                                                        </h3>
                                                        <div className="flex items-center gap-3 mt-2">
                                                            <Badge variant="outline" className="bg-white/90 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-xl text-slate-400">
                                                                #{app.id.slice(0, 8)}
                                                            </Badge>
                                                            <Badge className={cn("border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-xl capitalize", colors.bgLight, colors.text, `hover:${colors.bg}`)}>
                                                                {(app.status || 'new').replace('_', ' ')}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                                    <Metric label="Yield Potential" value={`$${app.monthly_income?.toLocaleString()}/mo`} icon={DollarSign} />
                                                    <Metric label="Current Employer" value={app.employer || '---'} icon={Briefcase} />
                                                    <Metric label="Risk Analysis" value={app.credit_score || 'Pending'} icon={ShieldCheck} status={app.credit_score >= 700 ? 'positive' : app.credit_score >= 600 ? 'neutral' : 'warning'} />
                                                </div>

                                                {app.property && (
                                                    <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100/60 flex items-center gap-6 group-hover:bg-white transition-colors">
                                                        <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                                                            <Building2 className={cn("h-7 w-7", colors.text)} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Infrastructure</div>
                                                            <div className="text-xl font-black text-slate-900">
                                                                {app.property.address} {app.property.unit_number && `(Slot #${app.property.unit_number})`}
                                                            </div>
                                                        </div>
                                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                                                            <ArrowUpRight className="h-5 w-5" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right: Authorization Controls */}
                                            <div className="flex flex-row lg:flex-col gap-4 min-w-[220px] lg:border-l border-slate-100 lg:pl-10">
                                                <div className="space-y-4 w-full">
                                                    <Button
                                                        onClick={() => approveMutation.mutate(app.id)}
                                                        disabled={approveMutation.isPending || app.status === 'approved'}
                                                        className={cn(
                                                            "w-full h-16 text-white rounded-2xl shadow-xl font-black transition-all hover:scale-105 active:scale-95",
                                                            app.status === 'approved'
                                                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-none cursor-not-allowed"
                                                                : cn(colors.bg, `hover:${colors.bgHover}`, colors.shadow)
                                                        )}
                                                    >
                                                        <CheckCircle className="h-6 w-6 mr-3" />
                                                        {app.status === 'approved' ? 'Authorized' : 'Authorize'}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setDenyDialog({ open: true, applicationId: app.id })}
                                                        disabled={denyMutation.isPending || app.status === 'denied'}
                                                        className={cn(
                                                            "w-full h-16 rounded-2xl font-black transition-all hover:scale-105",
                                                            app.status === 'denied'
                                                                ? "border-rose-100 bg-rose-50 text-rose-600 shadow-none cursor-not-allowed"
                                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        <XCircle className="h-6 w-6 mr-3" />
                                                        {app.status === 'denied' ? 'Rejected' : 'Reject'}
                                                    </Button>
                                                </div>

                                                {app.status === 'approved' && (
                                                    <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            <FileText className="h-3 w-3" />
                                                            Finalization Logic
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            className="w-full justify-start h-12 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 font-bold px-4"
                                                            onClick={() => router.push(`/documents?type=lease_proposal&applicationId=${app.id}`)}
                                                        >
                                                            <ArrowUpRight className="h-4 w-4 mr-3" />
                                                            Draft Lease
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Bottom: Internal Notes & Documentation */}
                                        <div className="mt-10 pt-10 border-t border-slate-100">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", colors.bgLight)}>
                                                        <StickyNote className={cn("h-5 w-5", colors.text)} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-black text-slate-900 tracking-tight">Case Documentation</h4>
                                                        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-0.5">Internal Agent Notes & Protocol Discussion</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        const el = document.getElementById(`notes-${app.id}`) as HTMLTextAreaElement;
                                                        updateTermsMutation.mutate({
                                                            id: app.id,
                                                            notes: el.value
                                                        });
                                                    }}
                                                    disabled={updateTermsMutation.isPending}
                                                    className={cn("rounded-xl font-bold px-6 text-white", colors.bg, `hover:${colors.bgHover}`)}
                                                >
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Save Progress
                                                </Button>
                                            </div>
                                            <Textarea
                                                id={`notes-${app.id}`}
                                                defaultValue={app.additional_notes || ''}
                                                placeholder="Enter final negotiation details, security deposit arrangements, or move-in contingencies..."
                                                className="min-h-[120px] bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-[2rem] p-6 text-slate-600 font-medium text-sm leading-relaxed transition-all"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

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

function Metric({ label, value, icon: Icon, status }: any) {
    const statusColors: any = {
        positive: "text-emerald-500 bg-emerald-50 border-emerald-100",
        neutral: "text-amber-500 bg-amber-50 border-amber-100",
        warning: "text-rose-500 bg-rose-50 border-rose-100",
    }
    const colorClass = status ? statusColors[status] : "text-slate-400 bg-slate-50 border-slate-100";

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                <Icon className="h-3 w-3" />
                {label}
            </div>
            <div className={cn("inline-flex items-center px-4 py-1.5 rounded-xl border text-sm font-black transition-colors whitespace-nowrap", colorClass)}>
                {value}
            </div>
        </div>
    )
}
