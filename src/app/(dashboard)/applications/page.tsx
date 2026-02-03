'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCompanyId } from '@/lib/hooks/useCompanyId'
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
    Calendar,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    RefreshCw,
    ArrowRight,
    ClipboardList,
    Shield
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAccentColor } from '@/lib/hooks/useAccentColor'

export default function ApplicationsPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const { companyId, isLoading: isCompanyLoading } = useCompanyId()
    const { colors } = useAccentColor()
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    // Fetch applications with security filter
    const { data: applications, isLoading, error, refetch } = useQuery({
        queryKey: ['applications', statusFilter, companyId],
        queryFn: async () => {
            if (!companyId) return []

            let query = supabase
                .from('applications')
                .select(`
                    *,
                    property:properties(id, address, unit_number, rent)
                `)
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })

            if (statusFilter && statusFilter !== 'all') {
                query = query.eq('status', statusFilter)
            }

            const { data, error } = await query
            if (error) throw error
            return data || []
        },
        enabled: !!companyId,
        retry: 3,
        staleTime: 60 * 1000,
    })

    // Update status mutation
    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { data: { user } } = await supabase.auth.getUser()

            const { data, error } = await supabase
                .from('applications')
                .update({
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('company_id', companyId) // Security
                .select()
                .single()

            if (error) throw error

            // Log activity
            if (companyId) {
                await supabase.from('activity_log').insert({
                    company_id: companyId,
                    user_id: user?.id,
                    action: status === 'approved' ? 'approved' : status === 'denied' ? 'denied' : 'updated',
                    entity_type: 'application',
                    entity_id: id,
                    details: { new_status: status }
                })
            }

            return data
        },
        onSuccess: () => {
            toast.success('Application updated successfully')
            queryClient.invalidateQueries({ queryKey: ['applications'] })
        },
        onError: (err: any) => {
            toast.error('Failed to update application', { description: err.message })
        }
    })

    const filteredApplications = applications?.filter(app => {
        if (!searchTerm) return true
        const search = searchTerm.toLowerCase()
        const applicantName = app.applicant_name?.toLowerCase() || ''
        const applicantEmail = app.applicant_email?.toLowerCase() || ''

        let address = ''
        if (app.property) {
            address = (Array.isArray(app.property) ? app.property[0]?.address : (app.property as any)?.address)?.toLowerCase() || ''
        }

        return applicantName.includes(search) || applicantEmail.includes(search) || address.includes(search)
    })

    if (isLoading || isCompanyLoading) {
        return (
            <div className="p-10 space-y-10">
                <div className="flex justify-between items-center">
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-48 rounded-xl" />
                        <Skeleton className="h-4 w-96 rounded-lg" />
                    </div>
                </div>
                <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-40 w-full rounded-[2.5rem]" />
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-10 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="h-20 w-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mb-6">
                    <AlertTriangle className="h-10 w-10 text-rose-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Unable to Load Applications</h2>
                <p className="text-slate-500 font-medium mb-8 max-w-md">{(error as Error).message}</p>
                <Button onClick={() => refetch()} className="bg-slate-900 text-white rounded-xl">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        )
    }

    return (
        <div className="relative p-6 lg:p-10 space-y-10">
            {/* Decoration */}
            <div className="absolute top-0 left-0 w-[40rem] h-[40rem] bg-indigo-50/50 rounded-full blur-[120px] -z-10 animate-pulse" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1", colors.text)}>
                        <ClipboardList className="h-3 w-3" />
                        <span>Tenant Applications</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Applications</h1>
                    <p className="text-slate-500 font-medium">
                        Manage tenant applications ({filteredApplications?.length || 0} total)
                    </p>
                </div>
                <Button asChild className={cn("h-12 px-6 rounded-2xl text-white font-bold shadow-lg transition-all hover:-translate-y-0.5", colors.bg, `hover:${colors.bgHover}`, colors.shadow)}>
                    <Link href="/applications/new">
                        <User className="h-4 w-4 mr-2" /> Add Application
                    </Link>
                </Button>
            </div>

            {/* Filters */}
            <Card className="bg-white/80 backdrop-blur-xl border-slate-100 rounded-[2rem] shadow-xl shadow-slate-200/50 p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                    <div className="relative flex-1 group">
                        <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors", `group-focus-within:${colors.text}`)} />
                        <Input
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={cn("h-14 pl-12 bg-slate-50 border-transparent focus:bg-white transition-all rounded-xl font-medium", `focus:${colors.border}`)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-14 w-full sm:w-64 bg-slate-50 border-transparent text-slate-600 font-bold rounded-xl">
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

            {/* List */}
            {!filteredApplications || filteredApplications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center bg-white/50 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                        <User className="h-8 w-8 text-slate-200" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">No applications yet</h3>
                    <p className="text-slate-500 font-medium mt-2 max-w-sm">Applications will appear here when tenants apply or you add them manually.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    <AnimatePresence>
                        {filteredApplications.map((app, idx) => (
                            <motion.div
                                key={app.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4, delay: idx * 0.05 }}
                            >
                                <ApplicationCard
                                    application={app}
                                    onApprove={() => updateStatus.mutate({ id: app.id, status: 'approved' })}
                                    onDeny={() => updateStatus.mutate({ id: app.id, status: 'denied' })}
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

function ApplicationCard({ application, onApprove, onDeny, isUpdating }: any) {
    const statusConfig: any = {
        new: { label: 'New', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: Clock },
        submitted: { label: 'Submitted', color: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: Clock },
        screening: { label: 'Screening', color: 'bg-amber-50 text-amber-600 border-amber-100', icon: Shield },
        pending_landlord: { label: 'Pending Review', color: 'bg-purple-50 text-purple-600 border-purple-100', icon: User },
        approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle },
        denied: { label: 'Denied', color: 'bg-rose-50 text-rose-600 border-rose-100', icon: XCircle }
    }

    const status = statusConfig[application.status] || statusConfig.new
    const StatusIcon = status.icon
    const canTakeAction = ['new', 'submitted', 'screening', 'pending_landlord'].includes(application.status)

    let property: any = application.property
    if (Array.isArray(property)) property = property[0]

    return (
        <Card className="group relative bg-white/80 backdrop-blur-md rounded-[2.5rem] border-slate-100 shadow-lg shadow-slate-200/40 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 overflow-hidden">
            <div className="flex flex-col lg:flex-row">
                <div className="flex-1 p-8">
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                                <User className="h-8 w-8 text-slate-300 group-hover:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                                    {application.applicant_name}
                                </h3>
                                <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-xl border mt-2 text-[10px] font-black uppercase tracking-widest", status.color)}>
                                    <StatusIcon className="h-3 w-3" />
                                    {status.label}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Log Issued</div>
                            <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-lg">
                                {application.created_at ? formatDistanceToNow(new Date(application.created_at), { addSuffix: true }) : '---'}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <InfoItem icon={Mail} label="Contact Email" value={application.applicant_email} />
                        <InfoItem icon={Phone} label="Contact Phone" value={application.applicant_phone || '---'} />
                        <InfoItem icon={DollarSign} label="Monthly Income" value={application.monthly_income ? `$${Number(application.monthly_income).toLocaleString()}` : '---'} />
                        <InfoItem icon={Calendar} label="Move-in Target" value={application.move_in_date ? new Date(application.move_in_date).toLocaleDateString() : '---'} />
                    </div>

                    <div className="p-4 rounded-[1.5rem] bg-slate-50 border border-slate-100/60 flex items-center gap-4 group-hover:bg-slate-100/50 transition-colors">
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                            <Building2 className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div className="flex-1">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Target Infrastructure</div>
                            <div className="text-sm font-black text-slate-700">
                                {property?.address || '---'} {property?.unit_number && `(Slot #${property.unit_number})`}
                            </div>
                        </div>
                        {property?.rent && (
                            <div className="text-right">
                                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Target Yield</div>
                                <div className="text-lg font-black text-slate-900">${Number(property.rent).toLocaleString()}</div>
                            </div>
                        )}
                    </div>
                </div>

                {canTakeAction && (
                    <div className="flex lg:flex-col gap-3 p-8 lg:border-l border-slate-100 bg-slate-50/50">
                        <Button
                            onClick={onApprove}
                            disabled={isUpdating}
                            className="flex-1 lg:flex-none h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-500/20 font-black transition-all hover:scale-105"
                        >
                            <CheckCircle className="h-5 w-5 mr-3" />
                            Issue Clearance
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onDeny}
                            disabled={isUpdating}
                            className="flex-1 lg:flex-none h-14 border-rose-100 bg-white text-rose-600 hover:bg-rose-50 rounded-2xl font-black transition-all hover:scale-105"
                        >
                            <XCircle className="h-5 w-5 mr-3" />
                            Reject Protocol
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    )
}

function InfoItem({ icon: Icon, label, value }: any) {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                <Icon className="h-3 w-3" />
                {label}
            </div>
            <div className="text-sm font-bold text-slate-600 truncate">{value}</div>
        </div>
    )
}
