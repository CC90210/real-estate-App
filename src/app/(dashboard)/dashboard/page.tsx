'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Building2,
    Home,
    ClipboardList,
    Users,
    Plus,
    TrendingUp,
    Clock,
    CheckCircle,
    FileText,
    Sparkles,
    ArrowRight,
    LayoutDashboard,
    Activity,
    ArrowUpRight,
    Search
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

function CheckListItem({ title, description, href, completed, index }: any) {
    return (
        <Link href={href}>
            <div className={cn(
                "group relative p-6 rounded-3xl border transition-all duration-300 h-full overflow-hidden",
                completed
                    ? "bg-emerald-50/50 border-emerald-100/50 opacity-90"
                    : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1"
            )}>
                {/* Decoration */}
                <div className={cn(
                    "absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl transition-opacity duration-500",
                    completed ? "bg-emerald-200/20" : "bg-blue-100/30 opacity-0 group-hover:opacity-100"
                )} />

                <div className="relative flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                        <div className={cn(
                            "h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-500",
                            completed ? "bg-emerald-100 text-emerald-600" : "bg-blue-50 text-blue-600 group-hover:scale-110 group-hover:rotate-3"
                        )}>
                            {completed ? <CheckCircle className="h-6 w-6" /> : <Sparkles className="h-5 w-5" />}
                        </div>
                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Step {index + 1}</div>
                    </div>

                    <h3 className={cn(
                        "font-bold text-base mb-2 transition-colors",
                        completed ? "text-emerald-900 line-through decoration-emerald-200" : "text-slate-900 group-hover:text-blue-600"
                    )}>{title}</h3>

                    <p className="text-sm text-slate-500 font-medium leading-relaxed flex-1">{description}</p>

                    {!completed && (
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                            Configure Workspace <ArrowRight className="h-4 w-4" />
                        </div>
                    )}
                </div>
            </div>
        </Link>
    )
}

export default function DashboardPage() {
    const { user, profile, company } = useAuth()
    const supabase = createClient()

    // Fetch dashboard stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats', company?.id],
        queryFn: async () => {
            if (!company?.id) return null;

            const [
                { count: totalProperties },
                { count: availableProperties },
                { count: totalApplications },
                { count: pendingApplications },
                { count: teamMembers }
            ] = await Promise.all([
                supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
                supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'available'),
                supabase.from('applications').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
                supabase.from('applications').select('*', { count: 'exact', head: true }).eq('company_id', company.id).in('status', ['submitted', 'screening', 'pending_landlord']),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', company.id)
            ])

            return {
                totalProperties: totalProperties || 0,
                availableProperties: availableProperties || 0,
                totalApplications: totalApplications || 0,
                pendingApplications: pendingApplications || 0,
                teamMembers: teamMembers || 1
            }
        },
        enabled: !!company?.id
    })

    // Fetch recent activity
    const { data: recentActivity } = useQuery({
        queryKey: ['recent-activity', company?.id],
        queryFn: async () => {
            if (!company?.id) return [];
            const { data } = await supabase
                .from('activity_log')
                .select(`
                    *,
                    user:profiles(full_name, avatar_url)
                `)
                .eq('company_id', company.id)
                .order('created_at', { ascending: false })
                .limit(10)
            return data || []
        },
        enabled: !!company?.id
    })

    // Fetch recent applications
    const { data: recentApplications } = useQuery({
        queryKey: ['recent-applications-dashboard', company?.id],
        queryFn: async () => {
            if (!company?.id) return [];
            const { data } = await supabase
                .from('applications')
                .select(`
                    id,
                    applicant_name,
                    status,
                    created_at,
                    property:properties(unit_number, rent)
                `)
                .eq('company_id', company.id)
                .order('created_at', { ascending: false })
                .limit(5)
            return data || []
        },
        enabled: !!company?.id
    })

    if (statsLoading && !stats) {
        return <DashboardSkeleton />
    }

    return (
        <div className="relative p-6 lg:p-10 space-y-10">
            {/* Background elements */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[10%] left-[20%] w-[40rem] h-[40rem] bg-blue-50/50 rounded-full blur-[120px] animate-float opacity-40" />
                <div className="absolute bottom-[20%] right-[10%] w-[30rem] h-[30rem] bg-indigo-50/50 rounded-full blur-[100px] animate-float opacity-30" style={{ animationDelay: '-4s' }} />
            </div>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-2 animate-in fade-in slide-in-from-left duration-700">
                        <LayoutDashboard className="h-3 w-3" />
                        <span>Command Center</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        Welcome back, <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {profile?.full_name?.split(' ')[0] || 'Member'}
                        </span>
                    </h1>
                    <p className="text-slate-500 font-medium text-lg flex items-center gap-2">
                        {company?.name || 'Your Global Portfolio'}
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="text-slate-400">Production Mode</span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all bg-white/50 backdrop-blur-sm">
                        <Search className="h-4 w-4 mr-2" /> Quick Find
                    </Button>
                    <Button asChild className="h-12 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-0.5 border-0">
                        <Link href="/properties/new">
                            <Plus className="h-5 w-5 mr-2" /> Add Asset
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Portfolio Assets"
                    value={stats?.totalProperties || 0}
                    subtitle={`${stats?.availableProperties || 0} Ready for Lease`}
                    icon={Home}
                    gradient="from-blue-500 to-blue-600"
                    trend="+12%"
                />
                <StatCard
                    title="Active Pipeline"
                    value={stats?.totalApplications || 0}
                    subtitle={`${stats?.pendingApplications || 0} Pending Verification`}
                    icon={ClipboardList}
                    gradient="from-indigo-500 to-indigo-600"
                    trend="+5.2%"
                />
                <StatCard
                    title="Intelligence Team"
                    value={stats?.teamMembers || 0}
                    subtitle="Certified Personnel"
                    icon={Users}
                    gradient="from-violet-500 to-violet-600"
                />
                <StatCard
                    title="Deployment Units"
                    value={stats?.availableProperties || 0}
                    subtitle="Inventory Capacity"
                    icon={TrendingUp}
                    gradient="from-cyan-500 to-cyan-600"
                    trend="Stable"
                />
            </div>

            {/* Getting Started Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Onboarding Protocol</h2>
                    <div className="h-px flex-1 bg-slate-100" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <CheckListItem
                        index={0}
                        title="Establish Areas"
                        description="Define geographical territories for organizational governance."
                        href="/areas"
                        completed={(stats?.totalProperties || 0) > 0}
                    />
                    <CheckListItem
                        index={1}
                        title="Register Buildings"
                        description="Deploy structural assets into your defined command areas."
                        href="/properties"
                        completed={(stats?.totalProperties || 0) > 0}
                    />
                    <CheckListItem
                        index={2}
                        title="Upload Inventory"
                        description="Input specific unit details, media, and configurations."
                        href="/properties/new"
                        completed={(stats?.totalProperties || 0) > 0}
                    />
                    <CheckListItem
                        index={3}
                        title="Deploy Personnel"
                        description="Provision secure access for agents and administrators."
                        href="/settings/team"
                        completed={(stats?.teamMembers || 0) > 1}
                    />
                </div>
            </div>

            {/* Data Intelligence Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Applications */}
                <Card className="lg:col-span-2 rounded-[2.5rem] border-slate-100/50 bg-white/50 backdrop-blur-xl shadow-2xl shadow-slate-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Recent Applications</CardTitle>
                            <p className="text-sm font-medium text-slate-500">Incoming inquiries across all channels</p>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="font-bold text-blue-600 hover:bg-blue-50 rounded-xl">
                            <Link href="/applications">View All <ArrowUpRight className="h-4 w-4 ml-1" /></Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        {recentApplications && recentApplications.length > 0 ? (
                            <div className="space-y-4">
                                {recentApplications.map(app => (
                                    <div key={app.id} className="group flex items-center justify-between p-5 rounded-3xl bg-white border border-slate-100 hover:border-blue-200 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center font-bold text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                                {app.applicant_name[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 leading-none mb-1">{app.applicant_name}</p>
                                                <p className="text-xs font-semibold text-slate-400">
                                                    Property {(app.property as any)?.unit_number || 'Unknown'} • ${(app.property as any)?.rent || '0'}/mo
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <StatusBadge status={app.status} />
                                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">
                                                {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="h-20 w-20 bg-slate-50 rounded-[2rem] flex items-center justify-center">
                                    <ClipboardList className="h-8 w-8 text-slate-200" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-900">Zero active applications</p>
                                    <p className="text-sm text-slate-500 max-w-[200px] leading-relaxed">Incoming applicant data will appear here in real-time.</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Activity Feed */}
                <Card className="rounded-[2.5rem] border-slate-100/50 bg-white/50 backdrop-blur-xl shadow-2xl shadow-slate-200/50 flex flex-col">
                    <CardHeader className="p-8 pb-4">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Operations Log</CardTitle>
                            <p className="text-sm font-medium text-slate-500">Live operational transparency</p>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 flex-1 overflow-y-auto">
                        {recentActivity && recentActivity.length > 0 ? (
                            <div className="relative space-y-8 before:absolute before:inset-0 before:left-[1.35rem] before:w-0.5 before:bg-slate-100">
                                {recentActivity.map(activity => (
                                    <div key={activity.id} className="relative pl-10">
                                        <div className="absolute left-0 top-1 h-11 w-11 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center z-10 transition-transform hover:scale-110">
                                            {activity.user?.avatar_url ? (
                                                <img src={activity.user.avatar_url} className="h-9 w-9 rounded-xl object-cover" />
                                            ) : (
                                                <span className="text-xs font-black text-blue-600">{activity.user?.full_name?.[0] || '?'}</span>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm leading-snug">
                                                <span className="font-black text-slate-900">{activity.user?.full_name || 'System Operator'}</span>
                                                <span className="text-slate-500 font-medium"> {formatAction(activity.action)} </span>
                                                <span className="font-bold text-blue-600">{activity.entity_type}</span>
                                            </p>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4">
                                <Activity className="h-10 w-10 text-slate-100 animate-pulse" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Listening for events...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

// Helper Components

function StatCard({ title, value, subtitle, icon: Icon, gradient, trend }: any) {
    return (
        <div className="group relative p-8 rounded-[2.5rem] bg-white border border-slate-100 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 overflow-hidden">
            <div className={cn(
                "absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[40px] opacity-10 transition-transform duration-700 group-hover:scale-150 bg-gradient-to-br",
                gradient
            )} />

            <div className="relative flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-500 group-hover:rotate-6 bg-gradient-to-br",
                        gradient
                    )}>
                        <Icon className="h-7 w-7" />
                    </div>
                    {trend && (
                        <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" /> {trend}
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black text-slate-900 tracking-tight">{value}</h3>
                    </div>
                    <p className="text-xs font-semibold text-slate-400">{subtitle}</p>
                </div>
            </div>
        </div>
    )
}

function StatusBadge({ status }: any) {
    const config: Record<string, { label: string; class: string }> = {
        submitted: { label: 'New', class: 'bg-blue-50 text-blue-600 border-blue-100' },
        screening: { label: 'Screening', class: 'bg-amber-50 text-amber-600 border-amber-100' },
        pending_landlord: { label: 'Review', class: 'bg-purple-50 text-purple-600 border-purple-100' },
        approved: { label: 'Approved', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        denied: { label: 'Denied', class: 'bg-rose-50 text-rose-600 border-rose-100' }
    }
    const c = config[status] || { label: status, class: 'bg-slate-50 text-slate-600 border-slate-100' }
    return (
        <span className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border", c.class)}>
            {c.label}
        </span>
    )
}

function formatAction(action: string): string {
    const actions: Record<string, string> = {
        created: 'initialized',
        updated: 'modified',
        deleted: 'removed',
        approved: 'authorized',
        denied: 'declined',
        AREA_CREATED: 'deployed new'
    }
    return actions[action] || action.toLowerCase()
}

function DashboardSkeleton() {
    return (
        <div className="p-10 space-y-10">
            <div className="space-y-4">
                <Skeleton className="h-12 w-96 rounded-2xl" />
                <Skeleton className="h-6 w-64 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-44 rounded-[2.5rem]" />
                ))}
            </div>
            <div className="space-y-6">
                <Skeleton className="h-8 w-48 rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-48 rounded-3xl" />
                    ))}
                </div>
            </div>
        </div>
    )
}
