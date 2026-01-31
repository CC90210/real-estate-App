'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Users, Clock, CheckCircle2, DollarSign, Calendar } from 'lucide-react';
import Link from 'next/link';

interface AgentDashboardProps {
    profile: any;
    stats: {
        activeLeads: number;
        showingsScheduled: number;
        pendingApps: number;
        dealsClosed: number;
    };
    recentApps: any[];
}

export function AgentDashboard({ profile, stats, recentApps }: AgentDashboardProps) {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    Agent Command Center
                </h1>
                <p className="text-slate-500 mt-1">
                    Welcome back, <span className="font-semibold text-blue-600">{profile?.full_name}</span>. You have <span className="text-slate-900 font-bold">{stats.activeLeads} active leads</span> requiring attention.
                </p>
            </div>

            {/* Pipeline Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <PipelineCard
                    title="Active Leads"
                    value={stats.activeLeads}
                    icon={Users}
                    color="text-blue-600"
                    bg="bg-blue-50"
                    desc="New inquiries"
                />
                <PipelineCard
                    title="Showings"
                    value={stats.showingsScheduled}
                    icon={Calendar}
                    color="text-indigo-600"
                    bg="bg-indigo-50"
                    desc="Scheduled today"
                />
                <PipelineCard
                    title="Pending Apps"
                    value={stats.pendingApps}
                    icon={Clock}
                    color="text-amber-600"
                    bg="bg-amber-50"
                    desc="Awaiting review"
                />
                <PipelineCard
                    title="Deals Closed"
                    value={stats.dealsClosed}
                    icon={CheckCircle2}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                    desc="This month"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Task Feed */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle>Priority Tasks</CardTitle>
                            <CardDescription>Your daily to-do list based on lead activity.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Mock Tasks */}
                                <TaskItem text="Follow up with John Doe re: Unit 402" time="10:00 AM" type="Call" />
                                <TaskItem text="Showing at 88 Harbour St" time="2:30 PM" type="Showing" />
                                <TaskItem text="Send lease agreement to Sarah Smith" time="4:00 PM" type="Doc" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                                <CardTitle>Recent Applications</CardTitle>
                                <Link href="/applications" className="text-sm font-medium text-blue-600 hover:underline">View Pipeline</Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y divide-slate-100">
                                {recentApps.map((app: any) => (
                                    <div key={app.id} className="py-4 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                                {app.applicant_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{app.applicant_name}</p>
                                                <p className="text-xs text-slate-500">{app.properties?.address}</p>
                                            </div>
                                        </div>
                                        <Badge variant={app.status === 'pending' ? 'secondary' : 'outline'}>
                                            {app.status}
                                        </Badge>
                                    </div>
                                ))}
                                {recentApps.length === 0 && <p className="text-sm text-slate-500 italic py-4">No active applications.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Performance Side-Bar (Agent Restricted View - No sensitive ROI data) */}
                <div className="space-y-6">
                    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-400" />
                            Commission Tracker
                        </h3>
                        <p className="text-slate-400 text-sm mb-6">Estimated earnings for current pipeline.</p>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-300">Pending</span>
                                    <span className="font-mono">$3,400</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500 w-[60%]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-300">Closed (MTD)</span>
                                    <span className="font-mono text-emerald-400">$6,200</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[85%]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PipelineCard({ title, value, icon: Icon, color, bg, desc }: any) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between hover:shadow-md transition-all">
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
            </div>
            <div className={`p-3 rounded-xl ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
        </div>
    );
}

function TaskItem({ text, time, type }: any) {
    const colors: any = {
        'Call': 'bg-blue-100 text-blue-700',
        'Showing': 'bg-purple-100 text-purple-700',
        'Doc': 'bg-orange-100 text-orange-700'
    };
    return (
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${colors[type] || 'bg-slate-200'}`}>
                {type}
            </div>
            <span className="text-sm font-medium text-slate-700 flex-1">{text}</span>
            <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100">{time}</span>
        </div>
    );
}
