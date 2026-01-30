'use client';

import { useUser } from '@/lib/hooks/useUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Users,
    Settings,
    Activity,
    ShieldCheck,
    UserPlus,
    Database,
    LayoutDashboard,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboardPage() {
    const { profile } = useUser();

    if (profile?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
                <h2 className="text-xl font-bold text-slate-900">Admin Clearance Required</h2>
                <p className="text-slate-500 max-w-md mt-2">This module is reserved for platform administrators only.</p>
            </div>
        );
    }

    const stats = [
        { title: "Total Users", value: "24", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        { title: "Active Companies", value: "8", icon: Database, color: "text-purple-600", bg: "bg-purple-50" },
        { title: "System Health", value: "100%", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50" },
        { title: "Total Logins", value: "1.2k", icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Command</h1>
                    <p className="text-slate-500 mt-2">Manage infrastructure, identities, and security.</p>
                </div>
                <Button className="bg-slate-900 text-white gap-2">
                    <UserPlus className="w-4 h-4" /> Invite Stakeholder
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <Card key={i} className="border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">{stat.title}</CardTitle>
                            <div className={`p-2 rounded-md ${stat.bg}`}>
                                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                <span className="text-green-600 font-medium">+12%</span> from last month
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-600" /> System Events
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {[
                            { event: "Agent Signup", user: "Mike Ross (Agent)", time: "2 mins ago", status: "success" },
                            { event: "Database Backup", user: "PropFlow System", time: "1 hour ago", status: "success" },
                            { event: "Application Approved", user: "Sarah Mitchell (Landlord)", time: "3 hours ago", status: "success" },
                            { event: "Failed Login", user: "192.168.1.1", time: "5 hours ago", status: "warning" },
                            { event: "New Company Created", user: "Oasis Realty", time: "Yesterday", status: "success" },
                        ].map((log, i) => (
                            <div key={i} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-slate-50 transition-colors">
                                <div className="flex gap-4">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{log.event}</p>
                                        <p className="text-xs text-slate-500">{log.user}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-slate-400">{log.time}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-700">
                                <Settings className="w-4 h-4" /> Global Config
                            </Button>
                            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-700">
                                <ShieldCheck className="w-4 h-4" /> Security Audit
                            </Button>
                            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-700">
                                <Database className="w-4 h-4" /> Migration Logs
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg">
                        <h3 className="font-bold mb-2 flex items-center gap-2">
                            <LayoutDashboard className="w-5 h-5" /> Cloud Status
                        </h3>
                        <p className="text-xs text-blue-100 mb-4 opacity-80">All services operational. SingleKey API Latency: 42ms.</p>
                        <Button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-md border-0 text-white">
                            View Cloud Console
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
