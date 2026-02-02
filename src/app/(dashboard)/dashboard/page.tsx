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
    ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

function CheckListItem({ title, description, href, completed }: any) {
    return (
        <Link href={href}>
            <div className={`p-4 rounded-xl border transition-all h-full ${completed ? 'bg-white/50 border-green-100 opacity-80' : 'bg-white border-blue-100 hover:border-blue-400 hover:shadow-md'
                }`}>
                <div className="flex items-center gap-2 mb-2">
                    {completed ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-blue-200" />
                    )}
                    <h3 className={`font-bold text-sm ${completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>{title}</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
                {!completed && (
                    <div className="mt-3 flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        Configure <ArrowRight className="h-3 w-3" />
                    </div>
                )}
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
            const [
                { count: totalProperties },
                { count: availableProperties },
                { count: totalApplications },
                { count: pendingApplications },
                { count: teamMembers }
            ] = await Promise.all([
                supabase.from('properties').select('*', { count: 'exact', head: true }),
                supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'available'),
                supabase.from('applications').select('*', { count: 'exact', head: true }),
                supabase.from('applications').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'screening', 'pending_landlord']),
                supabase.from('profiles').select('*', { count: 'exact', head: true })
            ])

            return {
                totalProperties: totalProperties || 0,
                availableProperties: availableProperties || 0,
                totalApplications: totalApplications || 0,
                pendingApplications: pendingApplications || 0,
                teamMembers: teamMembers || 0
            }
        },
        enabled: !!company?.id
    })

    // Fetch recent activity
    const { data: recentActivity } = useQuery({
        queryKey: ['recent-activity', company?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('activity_log')
                .select(`
                    *,
                    user:profiles(full_name, avatar_url)
                `)
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
            const { data } = await supabase
                .from('applications')
                .select(`
                    id,
                    applicant_name,
                    status,
                    created_at,
                    property:properties(address)
                `)
                .order('created_at', { ascending: false })
                .limit(5)
            return data || []
        },
        enabled: !!company?.id
    })

    if (statsLoading) {
        return <DashboardSkeleton />
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
                    </h1>
                    <p className="text-gray-500">{company?.name || 'Your Dashboard'}</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild>
                        <Link href="/properties/new">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Property
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Onboarding Checklist (Show if low property count) */}
            {(stats?.totalProperties || 0) < 3 && (
                <Card className="border-blue-100 bg-blue-50/30">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-blue-600" />
                            Getting Started with PropFlow
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <CheckListItem
                                title="Define your Areas"
                                description="Create regions or neighborhoods you manage."
                                href="/areas"
                                completed={(stats?.totalProperties || 0) > 0}
                            />
                            <CheckListItem
                                title="Add Buildings"
                                description="Organize units within specific buildings."
                                href="/properties"
                                completed={(stats?.totalProperties || 0) > 0}
                            />
                            <CheckListItem
                                title="List Properties"
                                description="Create your first unit listings."
                                href="/properties/new"
                                completed={(stats?.totalProperties || 0) > 0}
                            />
                            <CheckListItem
                                title="Invite Team"
                                description="Add agents or landlords to your company."
                                href="/settings/team"
                                completed={(stats?.teamMembers || 0) > 1}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Properties"
                    value={stats?.totalProperties || 0}
                    subtitle={`${stats?.availableProperties || 0} available`}
                    icon={Home}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-100"
                />
                <StatCard
                    title="Applications"
                    value={stats?.totalApplications || 0}
                    subtitle={`${stats?.pendingApplications || 0} pending review`}
                    icon={ClipboardList}
                    iconColor="text-amber-600"
                    iconBg="bg-amber-100"
                />
                <StatCard
                    title="Team Members"
                    value={stats?.teamMembers || 0}
                    subtitle="Active users"
                    icon={Users}
                    iconColor="text-green-600"
                    iconBg="bg-green-100"
                />
                <StatCard
                    title="Available Units"
                    value={stats?.availableProperties || 0}
                    subtitle="Ready to lease"
                    icon={CheckCircle}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-100"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Applications */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Recent Applications</CardTitle>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/applications">View all</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {recentApplications && recentApplications.length > 0 ? (
                            <div className="space-y-3">
                                {recentApplications.map(app => (
                                    <div key={app.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                                        <div>
                                            <p className="font-medium">{app.applicant_name}</p>
                                            <p className="text-sm text-gray-500">{Array.isArray(app.property) ? app.property[0]?.address : (app.property as any)?.address}</p>
                                        </div>
                                        <div className="text-right">
                                            <StatusBadge status={app.status} />
                                            <p className="text-xs text-gray-400 mt-1">
                                                {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8">No applications yet</p>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentActivity && recentActivity.length > 0 ? (
                            <div className="space-y-3">
                                {recentActivity.map(activity => (
                                    <div key={activity.id} className="flex items-start gap-3">
                                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                                            {activity.user?.full_name?.[0] || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm">
                                                <span className="font-medium">{activity.user?.full_name || 'Someone'}</span>
                                                {' '}{formatAction(activity.action)}{' '}
                                                <span className="text-gray-600">{activity.entity_type}</span>
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8">No activity yet</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions (Admin Only) */}
            {profile?.role === 'admin' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <QuickAction
                                href="/properties/new"
                                icon={Home}
                                label="Add Property"
                            />
                            <QuickAction
                                href="/settings/team"
                                icon={Users}
                                label="Invite Team"
                            />
                            <QuickAction
                                href="/documents"
                                icon={FileText}
                                label="Generate Doc"
                            />
                            <QuickAction
                                href="/approvals"
                                icon={CheckCircle}
                                label="Review Apps"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

// Helper Components

function StatCard({ title, value, subtitle, icon: Icon, iconColor, iconBg }: any) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-gray-500">{title}</p>
                        <p className="text-2xl font-bold mt-1">{value}</p>
                        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${iconBg}`}>
                        <Icon className={`h-5 w-5 ${iconColor}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function QuickAction({ href, icon: Icon, label }: any) {
    return (
        <Link
            href={href}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
        >
            <Icon className="h-6 w-6 text-gray-600" />
            <span className="text-sm font-medium">{label}</span>
        </Link>
    )
}

function StatusBadge({ status }: any) {
    const config: Record<string, { label: string; class: string }> = {
        submitted: { label: 'New', class: 'bg-blue-100 text-blue-700' },
        screening: { label: 'Screening', class: 'bg-amber-100 text-amber-700' },
        pending_landlord: { label: 'Pending', class: 'bg-purple-100 text-purple-700' },
        approved: { label: 'Approved', class: 'bg-green-100 text-green-700' },
        denied: { label: 'Denied', class: 'bg-red-100 text-red-700' }
    }
    const c = config[status] || { label: status, class: 'bg-gray-100 text-gray-700' }
    return (
        <span className={`text-xs px-2 py-1 rounded-full ${c.class}`}>
            {c.label}
        </span>
    )
}

function formatAction(action: string): string {
    const actions: Record<string, string> = {
        created: 'created',
        updated: 'updated',
        deleted: 'deleted',
        approved: 'approved',
        denied: 'denied'
    }
    return actions[action] || action
}

function DashboardSkeleton() {
    return (
        <div className="p-6 space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-28" />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
            </div>
        </div>
    )
}
