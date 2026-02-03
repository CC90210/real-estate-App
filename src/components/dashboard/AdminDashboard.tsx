'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { useAccentColor } from '@/lib/hooks/useAccentColor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Building2,
    Home,
    ClipboardList,
    Users,
    Plus,
    FileText,
    Sparkles,
    LayoutDashboard,
    Activity,
    ArrowUpRight,
    Search,
    MapPin,
    Calendar,
    Zap,
    Star,
    Building,
    Wallet
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
    StatCard,
    QuickActionCard,
    CheckListItem,
    StatusBadge,
    DashboardSkeleton,
    getDailyQuote,
    getGreeting,
    formatAction
} from './shared'

interface AdminDashboardProps {
    onQuickFind: () => void;
}

export default function AdminDashboard({ onQuickFind }: AdminDashboardProps) {
    const { user, profile, company } = useAuth()
    const supabase = createClient()
    const { colors } = useAccentColor()

    // Fetch dashboard stats with real trends
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats', company?.id],
        queryFn: async () => {
            if (!company?.id) return null;

            // Calculate date ranges for trend comparison
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

            const [
                { count: totalProperties },
                { count: availableProperties },
                { count: totalApplications },
                { count: pendingApplications },
                { count: teamMembers },
                { count: propertiesThisWeek },
                { count: propertiesLastWeek },
                { count: applicationsThisWeek },
                { count: applicationsLastWeek },
                { data: rentData }
            ] = await Promise.all([
                supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
                supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'available'),
                supabase.from('applications').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
                supabase.from('applications').select('*', { count: 'exact', head: true }).eq('company_id', company.id).in('status', ['submitted', 'screening', 'pending_landlord']),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
                supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', company.id).gte('created_at', oneWeekAgo.toISOString()),
                supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', company.id).gte('created_at', twoWeeksAgo.toISOString()).lt('created_at', oneWeekAgo.toISOString()),
                supabase.from('applications').select('*', { count: 'exact', head: true }).eq('company_id', company.id).gte('created_at', oneWeekAgo.toISOString()),
                supabase.from('applications').select('*', { count: 'exact', head: true }).eq('company_id', company.id).gte('created_at', twoWeeksAgo.toISOString()).lt('created_at', oneWeekAgo.toISOString()),
                supabase.from('properties').select('rent').eq('company_id', company.id).eq('status', 'rented')
            ]);

            // Calculate total monthly revenue from rented properties
            const totalMonthlyRent = rentData?.reduce((sum, p) => sum + (p.rent || 0), 0) || 0;

            // Calculate real trends
            const calcTrend = (current: number, previous: number): string | null => {
                if (previous === 0 && current === 0) return null;
                if (previous === 0) return current > 0 ? `+${current}` : null;
                const change = ((current - previous) / previous) * 100;
                if (change === 0) return null;
                return change > 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
            };

            return {
                totalProperties: totalProperties || 0,
                availableProperties: availableProperties || 0,
                totalApplications: totalApplications || 0,
                pendingApplications: pendingApplications || 0,
                teamMembers: teamMembers || 1,
                totalMonthlyRent,
                rentedCount: rentData?.length || 0,
                propertyTrend: calcTrend(propertiesThisWeek || 0, propertiesLastWeek || 0),
                applicationTrend: calcTrend(applicationsThisWeek || 0, applicationsLastWeek || 0),
            };
        },
        enabled: !!company?.id
    });

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
                    property:properties(unit_number, rent, address)
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

    const today = format(new Date(), 'EEEE, MMMM d, yyyy')

    return (
        <div className="relative p-6 lg:p-10 space-y-8">
            {/* Background elements */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[5%] left-[15%] w-[50rem] h-[50rem] bg-gradient-to-br from-blue-100/40 to-indigo-100/40 rounded-full blur-[120px] animate-float" />
                <div className="absolute bottom-[10%] right-[5%] w-[40rem] h-[40rem] bg-gradient-to-br from-violet-100/30 to-purple-100/30 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-4s' }} />
                <div className="absolute top-[60%] left-[50%] w-[30rem] h-[30rem] bg-gradient-to-br from-cyan-100/20 to-blue-100/20 rounded-full blur-[80px] animate-float" style={{ animationDelay: '-8s' }} />
            </div>

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-slate-400 text-sm font-medium animate-in fade-in slide-in-from-left duration-500">
                        <Calendar className="h-4 w-4" />
                        <span>{today}</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 animate-in fade-in slide-in-from-left duration-700">
                        {getGreeting()}, <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", colors.gradient)}>
                            {profile?.full_name?.split(' ')[0] || 'Admin'}
                        </span>
                    </h1>
                    <p className="text-slate-500 font-medium text-lg flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {company?.name || 'Your Company'}
                    </p>
                </div>

                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right duration-700">
                    <Button
                        variant="outline"
                        onClick={onQuickFind}
                        className="h-12 px-6 rounded-2xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all bg-white/80 backdrop-blur-sm shadow-lg shadow-slate-100"
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Quick Find
                        <kbd className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono hidden lg:inline">⌘K</kbd>
                    </Button>
                    <Button asChild className={cn("h-12 px-8 rounded-2xl text-white font-bold shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl border-0 bg-gradient-to-r", colors.gradient, colors.shadow)}>
                        <Link href="/properties/new">
                            <Plus className="h-5 w-5 mr-2" /> Add Property
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Daily Quote Card */}
            <div className="animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '100ms' }}>
                <div className={cn("relative overflow-hidden p-6 rounded-3xl shadow-2xl bg-gradient-to-r", colors.gradient, colors.shadow)}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                    <div className="relative flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-white/90 text-lg font-medium italic leading-relaxed">&quot;{getDailyQuote().quote}&quot;</p>
                            <p className="text-white/60 text-sm mt-2 font-medium">— {getDailyQuote().author}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '200ms' }}>
                <StatCard
                    title="Total Properties"
                    value={stats?.totalProperties || 0}
                    subtitle={`${stats?.availableProperties || 0} available`}
                    icon={Building}
                    gradient="from-blue-500 to-blue-600"
                    trend={stats?.propertyTrend}
                    href="/properties"
                />
                <StatCard
                    title="Applications"
                    value={stats?.totalApplications || 0}
                    subtitle={`${stats?.pendingApplications || 0} pending review`}
                    icon={ClipboardList}
                    gradient="from-indigo-500 to-indigo-600"
                    trend={stats?.applicationTrend}
                    href="/applications"
                />
                <StatCard
                    title="Monthly Revenue"
                    value={`$${(stats?.totalMonthlyRent || 0).toLocaleString()}`}
                    subtitle={`${stats?.rentedCount || 0} rented units`}
                    icon={Wallet}
                    gradient="from-emerald-500 to-emerald-600"
                    href="/invoices"
                />
                <StatCard
                    title="Team Members"
                    value={stats?.teamMembers || 0}
                    subtitle="Active users"
                    icon={Users}
                    gradient={colors.gradient}
                    href="/settings"
                />
            </div>

            {/* Quick Actions */}
            <div className="animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '300ms' }}>
                <div className="flex items-center gap-4 mb-4">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500" />
                        Quick Actions
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickActionCard
                        title="Add Property"
                        icon={Plus}
                        href="/properties/new"
                        color="blue"
                    />
                    <QuickActionCard
                        title="View Applications"
                        icon={ClipboardList}
                        href="/applications"
                        color="indigo"
                    />
                    <QuickActionCard
                        title="Schedule Showing"
                        icon={Calendar}
                        href="/showings"
                        color="violet"
                    />
                    <QuickActionCard
                        title="Create Invoice"
                        icon={FileText}
                        href="/invoices"
                        color="emerald"
                    />
                </div>
            </div>

            {/* Getting Started Section - Only show if no properties */}
            {((stats?.totalProperties || 0) === 0) && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '400ms' }}>
                    <div className="flex items-center gap-4">
                        <div className="p-2 rounded-xl bg-amber-100">
                            <Star className="h-5 w-5 text-amber-600" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Getting Started</h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <CheckListItem
                            index={0}
                            title="Create Areas"
                            description="Define the neighborhoods or regions you manage properties in."
                            href="/areas"
                            completed={(stats?.totalProperties || 0) > 0}
                            icon={MapPin}
                        />
                        <CheckListItem
                            index={1}
                            title="Add Buildings"
                            description="Register the buildings and properties in your portfolio."
                            href="/properties"
                            completed={(stats?.totalProperties || 0) > 0}
                            icon={Building2}
                        />
                        <CheckListItem
                            index={2}
                            title="Add Properties"
                            description="Add individual units with details, photos, and pricing."
                            href="/properties/new"
                            completed={(stats?.totalProperties || 0) > 0}
                            icon={Home}
                        />
                        <CheckListItem
                            index={3}
                            title="Invite Team"
                            description="Collaborate with team members to manage your portfolio."
                            href="/settings"
                            completed={(stats?.teamMembers || 0) > 1}
                            icon={Users}
                        />
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '500ms' }}>
                {/* Recent Applications */}
                <Card className="lg:col-span-3 rounded-[2rem] border-slate-100/50 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/30 overflow-hidden">
                    <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br", colors.gradient, colors.shadow)}>
                                <ClipboardList className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black text-slate-900">Recent Applications</CardTitle>
                                <p className="text-sm text-slate-500">Latest tenant applications</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild className={cn("font-bold rounded-xl", colors.text, `hover:${colors.bgLight}`)}>
                            <Link href="/applications">View All <ArrowUpRight className="h-4 w-4 ml-1" /></Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        {recentApplications && recentApplications.length > 0 ? (
                            <div className="space-y-3">
                                {recentApplications.map((app, idx) => (
                                    <Link key={app.id} href={`/applications/${app.id}`}>
                                        <div className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-transparent hover:border-indigo-200 hover:bg-white transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-bold text-slate-500 group-hover:from-indigo-100 group-hover:to-indigo-200 group-hover:text-indigo-600 transition-all">
                                                    {app.applicant_name?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 leading-none mb-1 group-hover:text-indigo-600 transition-colors">{app.applicant_name}</p>
                                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        Unit {(app.property as any)?.unit_number || 'N/A'} • ${(app.property as any)?.rent?.toLocaleString() || '0'}/mo
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
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                                <div className="h-20 w-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-[1.5rem] flex items-center justify-center">
                                    <ClipboardList className="h-8 w-8 text-slate-300" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-900">No applications yet</p>
                                    <p className="text-sm text-slate-500 max-w-[250px] leading-relaxed">Applications will appear here when tenants apply for your properties.</p>
                                </div>
                                <Button asChild size="sm" className="mt-2 rounded-xl">
                                    <Link href="/applications/new">
                                        <Plus className="h-4 w-4 mr-1" /> Add Application
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Activity Feed */}
                <Card className="lg:col-span-2 rounded-[2rem] border-slate-100/50 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/30 overflow-hidden flex flex-col">
                    <CardHeader className="p-6 pb-4">
                        <div className="flex items-center gap-3">
                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br", colors.gradient, colors.shadow)}>
                                <Activity className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black text-slate-900">Activity Log</CardTitle>
                                <p className="text-sm text-slate-500">Recent team activity</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 flex-1 overflow-y-auto max-h-[400px]">
                        {recentActivity && recentActivity.length > 0 ? (
                            <div className="relative space-y-6">
                                <div className="absolute left-[1.1rem] top-3 bottom-3 w-0.5 bg-gradient-to-b from-violet-200 via-slate-200 to-transparent rounded-full" />
                                {recentActivity.map((activity) => (
                                    <div key={activity.id} className="relative pl-10 group">
                                        <div className="absolute left-0 top-0 h-9 w-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center z-10 transition-all group-hover:scale-110 group-hover:shadow-md" style={{ borderColor: `var(--accent-primary)` }}>
                                            {activity.user?.avatar_url ? (
                                                <img src={activity.user.avatar_url} className="h-7 w-7 rounded-lg object-cover" />
                                            ) : (
                                                <span className="text-xs font-black" style={{ color: colors.primary }}>{activity.user?.full_name?.[0] || '?'}</span>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm leading-snug">
                                                <span className="font-bold text-slate-900">{activity.user?.full_name || 'System'}</span>
                                                <span className="text-slate-500"> {formatAction(activity.action)} </span>
                                                <span className="font-semibold" style={{ color: colors.primary }}>
                                                    {activity.details?.title || activity.entity_type}
                                                </span>
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-4">
                                <div className="h-16 w-16 bg-gradient-to-br from-violet-100 to-violet-200 rounded-2xl flex items-center justify-center animate-pulse">
                                    <Activity className="h-6 w-6 text-violet-400" />
                                </div>
                                <p className="text-sm font-medium text-slate-400">Waiting for activity...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
