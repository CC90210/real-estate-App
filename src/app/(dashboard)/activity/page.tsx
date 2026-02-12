'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
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
    Loader2
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { StatsService } from '@/lib/services/stats-service'
import { useAuth } from '@/lib/hooks/useAuth'

export default function ActivityPage() {
    const supabase = createClient()
    const { company } = useAuth()
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<string>('all')
    const statsService = new StatsService(supabase)

    const { data: activities, isLoading } = useQuery({
        queryKey: ['activity-feed', company?.id, filter],
        queryFn: async () => {
            if (!company?.id) return []
            return statsService.getRecentActivity(company.id, 100, filter)
        },
        enabled: !!company?.id,
    })

    const getIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'property': return <Home className="h-4 w-4" />
            case 'application': return <User className="h-4 w-4" />
            case 'document': return <FileText className="h-4 w-4" />
            case 'invoice': return <DollarSign className="h-4 w-4" />
            case 'maintenance': return <Wrench className="h-4 w-4" />
            case 'team': return <Users className="h-4 w-4" />
            case 'settings': return <Settings className="h-4 w-4" />
            default: return <Activity className="h-4 w-4" />
        }
    }

    const getIconColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'property': return 'bg-blue-50 text-blue-600'
            case 'application': return 'bg-purple-50 text-purple-600'
            case 'document': return 'bg-indigo-50 text-indigo-600'
            case 'invoice': return 'bg-emerald-50 text-emerald-600'
            case 'maintenance': return 'bg-rose-50 text-rose-600'
            case 'team': return 'bg-pink-50 text-pink-600'
            default: return 'bg-slate-50 text-slate-600'
        }
    }

    const formatAction = (action: string) => {
        return action.replace(/_/g, ' ')
    }

    const filteredActivities = activities?.filter(a => {
        const searchText = search.toLowerCase()
        const actionMatch = a.action.toLowerCase().includes(searchText)
        const entityMatch = a.entity_type.toLowerCase().includes(searchText)
        const userMatch = a.user?.full_name?.toLowerCase().includes(searchText)
        const metadataMatch = JSON.stringify(a.details || {}).toLowerCase().includes(searchText)
        return actionMatch || entityMatch || userMatch || metadataMatch
    })

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
                            <SelectItem value="property">Properties</SelectItem>
                            <SelectItem value="application">Applications</SelectItem>
                            <SelectItem value="invoice">Invoices</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="profile">Profile/Team</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading ? (
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
                                        {activity.user?.avatar_url ? (
                                            <img src={activity.user.avatar_url} alt="" className="h-full w-full object-cover" />
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
