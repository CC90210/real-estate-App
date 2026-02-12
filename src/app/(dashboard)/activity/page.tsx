'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCompanyId } from '@/lib/hooks/useCompanyId'
import { useAccentColor } from '@/lib/hooks/useAccentColor'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Activity, Search, Home, ClipboardList, FileText, Users,
    Settings, Zap, Loader2, Calendar, Receipt, BookOpen,
    Wrench, CheckCircle, UserPlus, Key, Upload, Download,
    Edit, Trash2, Eye, Send
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

const actionIcons: Record<string, any> = {
    property_created: Home,
    property_updated: Edit,
    property_deleted: Trash2,
    application_created: ClipboardList,
    application_updated: Edit,
    application_approved: CheckCircle,
    document_generated: FileText,
    invoice_created: Receipt,
    invoice_paid: CheckCircle,
    showing_created: Calendar,
    showing_completed: CheckCircle,
    team_member_invited: UserPlus,
    team_member_joined: Users,
    lease_created: BookOpen,
    lease_renewed: BookOpen,
    maintenance_created: Wrench,
    maintenance_completed: CheckCircle,
    settings_updated: Settings,
    data_export: Download,
    login: Key,
    webhook_sent: Send,
}

const actionColors: Record<string, string> = {
    created: 'bg-blue-100 text-blue-600',
    updated: 'bg-amber-100 text-amber-600',
    deleted: 'bg-red-100 text-red-600',
    approved: 'bg-emerald-100 text-emerald-600',
    denied: 'bg-red-100 text-red-600',
    completed: 'bg-emerald-100 text-emerald-600',
    paid: 'bg-emerald-100 text-emerald-600',
    invited: 'bg-indigo-100 text-indigo-600',
    joined: 'bg-indigo-100 text-indigo-600',
    generated: 'bg-purple-100 text-purple-600',
    renewed: 'bg-blue-100 text-blue-600',
    exported: 'bg-slate-100 text-slate-600',
    login: 'bg-slate-100 text-slate-600',
    sent: 'bg-sky-100 text-sky-600',
}

function getActionColor(action: string) {
    for (const [key, color] of Object.entries(actionColors)) {
        if (action.includes(key)) return color
    }
    return 'bg-slate-100 text-slate-600'
}

function getActionIcon(action: string) {
    return actionIcons[action] || Activity
}

export default function ActivityPage() {
    const supabase = createClient()
    const companyId = useCompanyId()
    const { colors } = useAccentColor()
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(0)
    const pageSize = 30

    const { data, isLoading } = useQuery({
        queryKey: ['activity', companyId, page],
        queryFn: async () => {
            if (!companyId) return { logs: [], count: 0 }
            const from = page * pageSize
            const to = from + pageSize - 1

            const { data: logs, error, count } = await supabase
                .from('activity_log')
                .select('*, profiles:user_id(full_name, email, avatar_url)', { count: 'exact' })
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })
                .range(from, to)

            if (error) throw error
            return { logs: logs || [], count: count || 0 }
        },
        enabled: !!companyId,
    })

    const logs = data?.logs || []
    const totalPages = Math.ceil((data?.count || 0) / pageSize)

    const filtered = search
        ? logs.filter((log: any) =>
            log.action?.toLowerCase().includes(search.toLowerCase()) ||
            log.description?.toLowerCase().includes(search.toLowerCase()) ||
            log.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
        )
        : logs

    // Group by date
    const grouped = filtered.reduce((acc: Record<string, any[]>, log: any) => {
        const date = format(new Date(log.created_at), 'yyyy-MM-dd')
        if (!acc[date]) acc[date] = []
        acc[date].push(log)
        return acc
    }, {})

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <Loader2 className={cn("w-10 h-10 animate-spin", colors.text)} />
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1", colors.text)}>
                    <Activity className="h-3 w-3" />
                    <span>Audit Trail</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">Activity Feed</h1>
                <p className="text-slate-500 font-medium mt-1">Track all actions across your organization.</p>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="Search activity..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 rounded-xl"
                />
            </div>

            {/* Timeline */}
            {Object.keys(grouped).length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Activity className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-lg font-bold text-slate-400">No activity yet</p>
                        <p className="text-sm text-slate-300 mt-1">Actions will appear here as they happen</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    {Object.entries(grouped).map(([date, entries]) => (
                        <div key={date}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-px flex-1 bg-slate-100" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                                </span>
                                <div className="h-px flex-1 bg-slate-100" />
                            </div>

                            <div className="space-y-2">
                                {(entries as any[]).map((log: any) => {
                                    const IconComponent = getActionIcon(log.action)
                                    const colorClass = getActionColor(log.action)

                                    return (
                                        <div
                                            key={log.id}
                                            className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50/50 transition-colors group"
                                        >
                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", colorClass)}>
                                                <IconComponent className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <span className="text-sm font-semibold text-slate-700">
                                                            {log.profiles?.full_name || 'System'}
                                                        </span>
                                                        <span className="text-sm text-slate-400 ml-1.5">
                                                            {log.description || log.action?.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-medium text-slate-300 whitespace-nowrap flex-shrink-0">
                                                        {format(new Date(log.created_at), 'h:mm a')}
                                                    </span>
                                                </div>
                                                {log.entity_type && (
                                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-0.5">
                                                        {log.entity_type}
                                                        {log.entity_id && ` • ${log.entity_id.slice(0, 8)}...`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="font-bold"
                    >
                        Previous
                    </Button>
                    <span className="text-xs font-medium text-slate-400">
                        Page {page + 1} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="font-bold"
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    )
}
