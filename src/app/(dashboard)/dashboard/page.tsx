'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { QuickFind, useQuickFind } from '@/components/QuickFind'
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
    Search,
    MapPin,
    DollarSign,
    Key,
    Calendar,
    Zap,
    Star,
    Building,
    Wallet,
    PieChart,
    BarChart3,
    Eye
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'

// Motivational quotes for real estate professionals
const motivationalQuotes = [
    { quote: "Every property tells a story. Help your clients write theirs.", author: "Unknown" },
    { quote: "Success in real estate comes from putting people first.", author: "Gary Keller" },
    { quote: "The best time to buy real estate was 20 years ago. The second best time is now.", author: "Proverb" },
    { quote: "Real estate is not about selling houses, it's about selling dreams.", author: "Unknown" },
    { quote: "Your reputation is your most valuable asset in this business.", author: "Barbara Corcoran" },
    { quote: "The fortune is in the follow-up.", author: "Jim Rohn" },
    { quote: "Build relationships, not transactions.", author: "Unknown" },
    { quote: "Every day is a new opportunity to close.", author: "Unknown" },
    { quote: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
    { quote: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
]

// Get quote based on day of year (changes daily)
function getDailyQuote() {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
    return motivationalQuotes[dayOfYear % motivationalQuotes.length]
}

// Get greeting based on time of day
function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
}

function CheckListItem({ title, description, href, completed, index, icon: Icon }: any) {
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
                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                            completed ? "bg-emerald-100 text-emerald-600" : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200 group-hover:scale-110 group-hover:rotate-3"
                        )}>
                            {completed ? <CheckCircle className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
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
                            Get Started <ArrowRight className="h-4 w-4" />
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
    const { open: quickFindOpen, setOpen: setQuickFindOpen } = useQuickFind()

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
                        {getGreeting()}, <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                            {profile?.full_name?.split(' ')[0] || 'Agent'}
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
                        onClick={() => setQuickFindOpen(true)}
                        className="h-12 px-6 rounded-2xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all bg-white/80 backdrop-blur-sm shadow-lg shadow-slate-100"
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Quick Find
                        <kbd className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono hidden lg:inline">⌘K</kbd>
                    </Button>
                    <Button asChild className="h-12 px-8 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-500/30 border-0">
                        <Link href="/properties/new">
                            <Plus className="h-5 w-5 mr-2" /> Add Property
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Quick Find Modal */}
            <QuickFind open={quickFindOpen} onOpenChange={setQuickFindOpen} />

            {/* Daily Quote Card */}
            <div className="animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '100ms' }}>
                <div className="relative overflow-hidden p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl shadow-2xl shadow-blue-500/20">
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
                    gradient="from-violet-500 to-violet-600"
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
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <ClipboardList className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black text-slate-900">Recent Applications</CardTitle>
                                <p className="text-sm text-slate-500">Latest tenant applications</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl">
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
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
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
                                        <div className="absolute left-0 top-0 h-9 w-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center z-10 transition-all group-hover:scale-110 group-hover:shadow-md group-hover:border-violet-200">
                                            {activity.user?.avatar_url ? (
                                                <img src={activity.user.avatar_url} className="h-7 w-7 rounded-lg object-cover" />
                                            ) : (
                                                <span className="text-xs font-black text-violet-600">{activity.user?.full_name?.[0] || '?'}</span>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm leading-snug">
                                                <span className="font-bold text-slate-900">{activity.user?.full_name || 'System'}</span>
                                                <span className="text-slate-500"> {formatAction(activity.action)} </span>
                                                <span className="font-semibold text-violet-600">{activity.entity_type}</span>
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

// Helper Components

function StatCard({ title, value, subtitle, icon: Icon, gradient, trend, href }: any) {
    const isNegative = trend && trend.startsWith('-');

    return (
        <Link href={href || '#'}>
            <div className="group relative p-6 rounded-[1.75rem] bg-white/80 backdrop-blur-sm border border-slate-100/80 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 hover:border-slate-200 overflow-hidden cursor-pointer">
                {/* Background glow */}
                <div className={cn(
                    "absolute -right-8 -top-8 w-28 h-28 rounded-full blur-[40px] opacity-20 transition-all duration-500 group-hover:opacity-40 group-hover:scale-150 bg-gradient-to-br",
                    gradient
                )} />

                <div className="relative flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 bg-gradient-to-br",
                            gradient
                        )}>
                            <Icon className="h-6 w-6" />
                        </div>
                        {trend && (
                            <div className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1",
                                isNegative ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                            )}>
                                <TrendingUp className={cn("h-3 w-3", isNegative && "rotate-180")} /> {trend}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
                        <p className="text-xs font-medium text-slate-400">{subtitle}</p>
                    </div>
                </div>

                {/* Hover indicator */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="h-4 w-4 text-slate-300" />
                </div>
            </div>
        </Link>
    )
}

function QuickActionCard({ title, icon: Icon, href, color }: any) {
    const colorMap: Record<string, string> = {
        blue: 'from-blue-500 to-blue-600 shadow-blue-200',
        indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-200',
        violet: 'from-violet-500 to-violet-600 shadow-violet-200',
        emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-200',
    }

    return (
        <Link href={href}>
            <div className="group p-4 rounded-2xl bg-white/80 border border-slate-100 hover:border-slate-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-110",
                        colorMap[color]
                    )}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900">{title}</span>
                </div>
            </div>
        </Link>
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
        <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border", c.class)}>
            {c.label}
        </span>
    )
}

function formatAction(action: string): string {
    const actions: Record<string, string> = {
        created: 'added',
        updated: 'updated',
        deleted: 'removed',
        approved: 'approved',
        denied: 'declined',
        AREA_CREATED: 'created'
    }
    return actions[action] || action.toLowerCase()
}

function DashboardSkeleton() {
    return (
        <div className="p-10 space-y-8">
            <div className="space-y-4">
                <Skeleton className="h-6 w-48 rounded-xl" />
                <Skeleton className="h-14 w-96 rounded-2xl" />
                <Skeleton className="h-5 w-64 rounded-xl" />
            </div>
            <Skeleton className="h-24 w-full rounded-3xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-40 rounded-[1.75rem]" />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Skeleton className="lg:col-span-3 h-96 rounded-[2rem]" />
                <Skeleton className="lg:col-span-2 h-96 rounded-[2rem]" />
            </div>
        </div>
    )
}
