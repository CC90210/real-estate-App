'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Shield, Users, Server, Database, Settings } from 'lucide-react';

interface AdminDashboardProps {
    profile: any;
    stats: {
        totalUsers: number;
        systemHealth: string;
        activeWebhooks: number;
    };
    logs: any[];
}

export function AdminDashboard({ profile, stats, logs }: AdminDashboardProps) {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-indigo-300 font-mono text-xs font-bold uppercase tracking-widest">
                        <Shield className="w-3 h-3" /> System Administrator
                    </div>
                    <h1 className="text-3xl font-black tracking-tight">
                        Global Control
                    </h1>
                    <p className="text-slate-400 mt-1 font-medium">
                        System Status: <span className="text-emerald-400">Operational</span>
                    </p>
                </div>
                <div className="relative z-10 flex gap-3">
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-white/10 transition-colors">
                        User Mgmt
                    </button>
                    <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-900/50 transition-colors">
                        Config Webhooks
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* System Stats */}
                <div className="space-y-4">
                    <SystemCard
                        title="Total Users"
                        value={stats.totalUsers}
                        icon={Users}
                        desc="Agents & Landlords"
                    />
                    <SystemCard
                        title="Active Webhooks"
                        value={stats.activeWebhooks}
                        icon={Server}
                        desc="n8n Integration Points"
                    />
                    <SystemCard
                        title="Database Size"
                        value="42 MB"
                        icon={Database}
                        desc="Supabase Usage"
                    />
                </div>

                {/* Audit Logs */}
                <Card className="lg:col-span-2 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            Global Audit Log
                        </CardTitle>
                        <CardDescription>Track all actions across the organization.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-0">
                            {logs?.map((log: any) => (
                                <div key={log.id} className="py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-4 -mx-4 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-3">
                                            <div className="mt-1">
                                                <div className={`w-2 h-2 rounded-full ${getActionColor(log.action)}`} />
                                            </div>
                                            <div>
                                                <p className="font-mono text-xs font-bold text-slate-500 mb-0.5">{log.action}</p>
                                                <p className="text-sm font-medium text-slate-900">{log.description}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400">
                                            {new Date(log.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {(!logs || logs.length === 0) && (
                                <div className="text-center py-12 text-slate-400 italic">No system logs found.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function SystemCard({ title, value, icon: Icon, desc }: any) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-2xl font-black text-slate-900">{value}</h3>
                <p className="text-xs text-indigo-500 font-medium mt-1">{desc}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
                <Icon className="w-6 h-6 text-slate-400" />
            </div>
        </div>
    );
}

function getActionColor(action: string) {
    if (action.includes('DELETE')) return 'bg-red-500';
    if (action.includes('CREATE')) return 'bg-emerald-500';
    if (action.includes('UPDATE')) return 'bg-amber-500';
    return 'bg-blue-500';
}
