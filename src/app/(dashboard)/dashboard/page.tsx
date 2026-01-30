
import { createClient } from '@/lib/supabase/server';
import { Building2, Users, FileText, ArrowRight, Activity, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

export default async function DashboardPage() {
    const supabase = await createClient();

    // Fetch Stats
    const { count: totalProperties } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true });

    const { count: availableCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available');

    const { count: applicationCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

    // Fetch Recent Activity
    const { data: recentActivity } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                <p className="text-slate-500 mt-2">Overview of your real estate portfolio.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Properties"
                    value={totalProperties || 0}
                    icon={Building2}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StatCard
                    title="Available Units"
                    value={availableCount || 0}
                    icon={Building2}
                    color="text-green-600"
                    bg="bg-green-50"
                />
                <StatCard
                    title="Active Applications"
                    value={applicationCount || 0}
                    icon={Users}
                    color="text-purple-600"
                    bg="bg-purple-50"
                />
                <StatCard
                    title="Pending Tasks"
                    value={3}
                    icon={Calendar}
                    color="text-amber-600"
                    bg="bg-amber-50"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-slate-200/50">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-slate-900">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-0">
                            {recentActivity?.map((activity: any) => (
                                <div key={activity.id} className="flex items-start gap-4 p-4 border-b last:border-0 hover:bg-slate-50 transition-colors">
                                    <div className="p-2 rounded-full bg-slate-100 mt-0.5">
                                        <Activity className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-900">{activity.description || 'Activity recorded'}</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {(!recentActivity || recentActivity.length === 0) && (
                                <div className="p-8 text-center text-slate-500">No recent activity found.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
                    <div className="grid gap-4">
                        <Link href="/documents">
                            <button className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group text-left">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">Generate Document</p>
                                        <p className="text-xs text-slate-500">Leases, notices, & more</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                            </button>
                        </Link>

                        <Link href="/areas">
                            <button className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group text-left">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">Manage Areas</p>
                                        <p className="text-xs text-slate-500">View buildings & units</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`p-4 rounded-xl ${bg}`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
        </div>
    );
}
