'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Home,
    ClipboardList,
    Users,
    Calendar as CalendarIcon,
    Search,
    MapPin,
    ArrowUpRight,
    ArrowRight,
    LayoutDashboard,
    Clock,
    CheckCircle,
    Building2,
    Star,
    Plus
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import {
    StatCard,
    QuickActionCard,
    CheckListItem,
    StatusBadge,
    DashboardSkeleton,
    getGreeting
} from './shared'

interface AgentDashboardProps {
    onQuickFind: () => void;
}

export default function AgentDashboard({ onQuickFind }: AgentDashboardProps) {
    const { user, profile, company } = useAuth()
    const supabase = createClient()

    // Fetch agent-specific stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['agent-stats', company?.id],
        queryFn: async () => {
            if (!company?.id) return null;

            // Calculate date ranges for trend comparison
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            const [
                { count: totalProperties },
                { count: availableProperties },
                { count: pendingApplications },
                { count: upcomingShowings },
                { count: propertiesLastWeek }, // For trend
                { count: propertiesThisWeek }, // For trend
            ] = await Promise.all([
                supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
                supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'available'),
                supabase.from('applications').select('*', { count: 'exact', head: true }).eq('company_id', company.id).in('status', ['submitted', 'screening']),
                supabase.from('showings').select('*', { count: 'exact', head: true }).eq('company_id', company.id).gte('scheduled_date', now.toISOString()),
                supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', company.id).gte('created_at', format(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')).lt('created_at', format(oneWeekAgo, 'yyyy-MM-dd')),
                supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', company.id).gte('created_at', format(oneWeekAgo, 'yyyy-MM-dd')),
            ]);

            // Calculate trend
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
                pendingApplications: pendingApplications || 0,
                upcomingShowings: upcomingShowings || 0,
                listingTrend: calcTrend(propertiesThisWeek || 0, propertiesLastWeek || 0)
            };
        },
        enabled: !!company?.id
    });

    // Fetch upcoming showings
    const { data: upcomingShowings } = useQuery({
        queryKey: ['agent-showings', company?.id],
        queryFn: async () => {
            if (!company?.id) return [];
            const { data } = await supabase
                .from('showings')
                .select(`
                    id,
                    scheduled_date,
                    status,
                    visitor_name,
                    property:properties(address, unit_number)
                `)
                .eq('company_id', company.id)
                .gte('scheduled_date', new Date().toISOString())
                .order('scheduled_date', { ascending: true })
                .limit(5)
            return data || []
        },
        enabled: !!company?.id
    })

    // Fetch recent applications (New leads)
    const { data: recentApplications } = useQuery({
        queryKey: ['agent-applications', company?.id],
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
            {/* Background elements - Agent gets a fresher, lighter look */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[5%] left-[60%] w-[50rem] h-[50rem] bg-gradient-to-br from-indigo-100/40 to-blue-100/40 rounded-full blur-[120px] animate-float" />
                <div className="absolute bottom-[20%] right-[80%] w-[40rem] h-[40rem] bg-gradient-to-br from-cyan-100/30 to-teal-100/30 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-4s' }} />
            </div>

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-slate-400 text-sm font-medium animate-in fade-in slide-in-from-left duration-500">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{today}</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 animate-in fade-in slide-in-from-left duration-700">
                        {getGreeting()}, <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                            {profile?.full_name?.split(' ')[0] || 'Agent'}
                        </span>
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 uppercase tracking-widest">
                            Licensed Agent
                        </span>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {company?.name || 'Your Company'}
                        </p>
                    </div>
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
                    <Button asChild className="h-12 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-0.5 border-0">
                        <Link href="/showings">
                            <CalendarIcon className="h-5 w-5 mr-2" /> My Schedule
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '200ms' }}>
                <StatCard
                    title="Active Listings"
                    value={stats?.availableProperties || 0}
                    subtitle="Available for rent"
                    icon={Home}
                    gradient="from-blue-500 to-blue-600"
                    trend={stats?.listingTrend}
                    href="/properties"
                />
                <StatCard
                    title="Upcoming Showings"
                    value={stats?.upcomingShowings || 0}
                    subtitle="Scheduled visits"
                    icon={CalendarIcon}
                    gradient="from-violet-500 to-violet-600"
                    href="/showings"
                    urgent={(stats?.upcomingShowings || 0) > 0}
                />
                <StatCard
                    title="New Leads"
                    value={stats?.pendingApplications || 0}
                    subtitle="Applications to screen"
                    icon={Users}
                    gradient="from-indigo-500 to-indigo-600"
                    href="/applications"
                    urgent={(stats?.pendingApplications || 0) > 0}
                />
                <StatCard
                    title="Portfolio Size"
                    value={stats?.totalProperties || 0}
                    subtitle="Total managed units"
                    icon={Building2}
                    gradient="from-slate-500 to-slate-600"
                    href="/properties"
                />
            </div>

            {/* Quick Actions */}
            <div className="animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '300ms' }}>
                <div className="flex items-center gap-4 mb-4">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Star className="h-5 w-5 text-amber-500" />
                        Agent Actions
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickActionCard
                        title="New Application"
                        description="Start screening"
                        icon={ClipboardList}
                        href="/applications/new"
                        color="indigo"
                    />
                    <QuickActionCard
                        title="Schedule Showing"
                        description="Book a visit"
                        icon={CalendarIcon}
                        href="/showings"
                        color="violet"
                    />
                    <QuickActionCard
                        title="Add Property"
                        description="New listing"
                        icon={Plus}
                        href="/properties/new"
                        color="blue"
                    />
                    <QuickActionCard
                        title="Send Document"
                        description="Lease generation"
                        icon={ArrowUpRight}
                        href="/documents"
                        color="emerald"
                    />
                </div>
            </div>

            {/* Main Content Grid - Agent Focused */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '500ms' }}>
                {/* Upcoming Showings (Priority for Agents) */}
                <Card className="lg:col-span-3 rounded-[2rem] border-slate-100/50 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/30 overflow-hidden">
                    <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
                                <CalendarIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black text-slate-900">Upcoming Showings</CardTitle>
                                <p className="text-sm text-slate-500">Your schedule for the next few days</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="font-bold text-violet-600 hover:bg-violet-50 rounded-xl">
                            <Link href="/showings">View Calendar <ArrowUpRight className="h-4 w-4 ml-1" /></Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        {upcomingShowings && upcomingShowings.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingShowings.map((showing) => (
                                    <div key={showing.id} className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-transparent hover:border-violet-200 hover:bg-white transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-14 rounded-xl bg-white border-2 border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{format(new Date(showing.scheduled_date), 'MMM')}</span>
                                                <span className="text-lg font-black text-slate-900 leading-none">{format(new Date(showing.scheduled_date), 'd')}</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 mb-1">{format(new Date(showing.scheduled_date), 'h:mm a')} • {showing.visitor_name}</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {(showing.property as any)?.address} {(showing.property as any)?.unit_number ? `#${(showing.property as any)?.unit_number}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                                                showing.status === 'confirmed' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                            )}>
                                                {showing.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                                <div className="h-20 w-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-[1.5rem] flex items-center justify-center">
                                    <CalendarIcon className="h-8 w-8 text-slate-300" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-900">No upcoming showings</p>
                                    <p className="text-sm text-slate-500 max-w-[250px] leading-relaxed">Schedule visits to properties to see them here.</p>
                                </div>
                                <Button asChild size="sm" className="mt-2 rounded-xl">
                                    <Link href="/showings">
                                        <Plus className="h-4 w-4 mr-1" /> Schedule Showing
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Leads/Applications */}
                <Card className="lg:col-span-2 rounded-[2rem] border-slate-100/50 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/30 overflow-hidden">
                    <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Users className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black text-slate-900">Recent Leads</CardTitle>
                                <p className="text-sm text-slate-500">New applicants</p>
                            </div>
                        </div>
                        <Link href="/applications" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">View All</Link>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        {recentApplications && recentApplications.length > 0 ? (
                            <div className="space-y-3">
                                {recentApplications.map((app) => (
                                    <Link key={app.id} href={`/applications/${app.id}`}>
                                        <div className="group flex items-center justify-between p-3 rounded-xl hover:bg-white hover:shadow-md transition-all cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                    {app.applicant_name?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 truncate">{app.applicant_name}</p>
                                                    <p className="text-[10px] text-slate-500 truncate">
                                                        Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                                                    </p>
                                                </div>
                                            </div>
                                            <StatusBadge status={app.status} />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-sm text-slate-400 font-medium">No active leads</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
