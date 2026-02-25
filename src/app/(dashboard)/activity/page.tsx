'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
    Activity,
    Home,
    User,
    FileText,
    DollarSign,
    Wrench,
    Users,
    Settings,
    Search,
    Filter,
    Loader2,
    BookOpen,
    AlertCircle,
    RefreshCw
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'

export default function ActivityPage() {
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<string>('all')

    const supabase = createClient()
    const { isLoading: authLoading, company, profile } = useAuth();
    const resolvedCompanyId = company?.id || profile?.company_id;

    // Direct query as requested to guarantee data load
    const { data: activities, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['activity-page-direct', resolvedCompanyId, filter],
        queryFn: async () => {
            if (!resolvedCompanyId) return []

            let q = supabase
                .from('activity_log')
                .select('id, action, entity_type, details, description, created_at, user_id')
                .eq('company_id', resolvedCompanyId)
                .order('created_at', { ascending: false })
                .limit(100)

            if (filter !== 'all') {
                q = q.eq('entity_type', filter)
            }

            const { data, error } = await q
            if (error) throw error
            if (!data || data.length === 0) return []

            // Fetch users manually to avoid Join/RLS issues
            const userIds = [...new Set(data.filter(a => a.user_id).map(a => a.user_id))]
            let userMap: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> = {}
            if (userIds.length > 0) {
                const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds)
                if (profs) {
                    userMap = profs.reduce((acc, p) => ({ ...acc, [p.id]: p }), {})
                }
            }

            return data.map(a => ({
                ...a,
                user: userMap[a.user_id] || { full_name: 'Unknown', avatar_url: null }
            }))
        },
        enabled: !!resolvedCompanyId,
        staleTime: 30000
    })

    const getIcon = (type: string) => {
        const t = type.toLowerCase()
        if (t.includes('property')) return <Home className="h-4 w-4" />
        if (t.includes('application')) return <User className="h-4 w-4" />
        if (t.includes('document')) return <FileText className="h-4 w-4" />
        if (t.includes('invoice')) return <DollarSign className="h-4 w-4" />
        if (t.includes('lease')) return <BookOpen className="h-4 w-4" />
        if (t.includes('maintenance')) return <Wrench className="h-4 w-4" />
        if (t.includes('team') || t.includes('profile')) return <Users className="h-4 w-4" />
        if (t.includes('settings')) return <Settings className="h-4 w-4" />
        return <Activity className="h-4 w-4" />
    }

    const getIconColor = (type: string) => {
        const t = type.toLowerCase()
        if (t.includes('property')) return 'bg-blue-50 text-blue-600'
        if (t.includes('application')) return 'bg-purple-50 text-purple-600'
        if (t.includes('document')) return 'bg-slate-50 text-slate-600'
        if (t.includes('invoice')) return 'bg-emerald-50 text-emerald-600'
        if (t.includes('lease')) return 'bg-blue-50 text-blue-600'
        if (t.includes('maintenance')) return 'bg-rose-50 text-rose-600'
        if (t.includes('team') || t.includes('profile')) return 'bg-pink-50 text-pink-600'
        return 'bg-slate-50 text-slate-600'
    }

    const formatAction = (action: string) => {
        return action.replace(/_/g, ' ')
    }

    const filteredActivities = activities?.filter(a => {
        const searchText = search.toLowerCase()
        if (!searchText) return true
        const actionMatch = a.action.toLowerCase().includes(searchText)
        const entityMatch = a.entity_type.toLowerCase().includes(searchText)
        const userMatch = a.user?.full_name?.toLowerCase().includes(searchText)
        const metadataMatch = JSON.stringify(a.details || {}).toLowerCase().includes(searchText)
        return actionMatch || entityMatch || userMatch || metadataMatch
    })

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-rose-600" />
            </div>
        );
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
        );
    }

    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto min-h-screen animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-[0.3em] mb-3">
                        <div className="h-2 w-2 bg-rose-600 rounded-full animate-pulse" />
                        Live Audit Trail
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Activity</h1>
                    <p className="text-lg font-medium text-slate-500 mt-2">Track every event across your organization.</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search activity..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-11 bg-white border-slate-100 rounded-xl font-bold text-sm shadow-sm"
                        />
                    </div>
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-full sm:w-44 h-11 bg-white border-slate-100 rounded-xl font-bold text-sm shadow-sm">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-slate-400" />
                                <SelectValue placeholder="Category" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 font-bold">
                            <SelectItem value="all">All Activity</SelectItem>
                            <SelectItem value="properties">Properties</SelectItem>
                            <SelectItem value="applications">Applications</SelectItem>
                            <SelectItem value="invoices">Invoices</SelectItem>
                            <SelectItem value="maintenance_requests">Maintenance</SelectItem>
                            <SelectItem value="leases">Leases</SelectItem>
                            <SelectItem value="profiles">Profile/Team</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isError ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white border border-dashed border-red-200 rounded-[3rem] text-center">
                    <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Failed to load activity</h3>
                    <p className="text-slate-500 font-medium max-w-xs mb-6">
                        {(error as Error)?.message || 'An error occurred while fetching activity data.'}
                    </p>
                    <Button onClick={() => refetch()} variant="outline" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </Button>
                </div>
            ) : isLoading ? (
                <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-24 bg-slate-50 border border-slate-100 rounded-3xl animate-pulse" />
                    ))}
                </div>
            ) : filteredActivities?.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white border border-dashed border-slate-200 rounded-[3rem] text-center">
                    <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Activity className="h-8 w-8 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">No activity recorded</h3>
                    <p className="text-slate-500 font-medium max-w-xs">Events will show up here as your team uses the platform.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredActivities?.map((activity) => (
                        <div
                            key={activity.id}
                            className="bg-white rounded-[2rem] border border-slate-50 p-6 flex items-start gap-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group"
                        >
                            <div className={cn(
                                "h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-300",
                                getIconColor(activity.entity_type)
                            )}>
                                {getIcon(activity.entity_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-slate-900 text-lg group-hover:text-blue-600 transition-colors uppercase">
                                            {formatAction(activity.action)}
                                        </p>
                                        <span className="text-[10px] font-black text-slate-400 px-2 py-0.5 bg-slate-100 rounded">
                                            {activity.entity_type}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                    </p>
                                </div>

                                <p className="text-sm font-medium text-slate-500 mt-1 max-w-2xl leading-relaxed">
                                    {activity.details?.title || activity.details?.name || activity.details?.address || `Activity on ${activity.entity_type}`}
                                </p>

                                <div className="flex items-center gap-2 mt-4">
                                    <div className="h-5 w-5 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                                        {(activity.user as any)?.avatar_url ? (
                                            <img src={(activity.user as any).avatar_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <Users className="h-3 w-3 text-slate-400" />
                                        )}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {activity.user?.full_name || 'System Auto'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
