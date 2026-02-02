'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Building, Users, AlertCircle, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'; // Assuming recharts is installed or using mock
import Link from 'next/link';

interface LandlordDashboardProps {
    profile: any;
    stats: {
        totalRevenue: number;
        occupancyRate: number;
        totalUnits: number;
        pendingRent: number;
    };
    recentApps: any[];
    revenueHistory?: { month: string; revenue: number }[];
}

export function LandlordDashboard({ profile, stats, recentApps, revenueHistory }: LandlordDashboardProps) {

    // Use real data if available, fallback to mock
    const revenueData = revenueHistory && revenueHistory.length > 0
        ? revenueHistory.map(r => ({ name: r.month, revenue: r.revenue }))
        : [
            { name: 'Jan', revenue: 0 },
            { name: 'Feb', revenue: 0 },
            { name: 'Mar', revenue: 0 },
            { name: 'Apr', revenue: 0 },
            { name: 'May', revenue: 0 },
            { name: 'Jun', revenue: stats.totalRevenue || 0 },
        ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Owner Overview
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Financial performance for <span className="font-semibold text-slate-900">{profile?.company_name || 'Personal Portfolio'}</span>.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white border border-slate-200 text-slate-700 font-bold text-sm px-4 py-2 rounded-lg hover:bg-slate-50 shadow-sm">
                        Export Report
                    </button>
                    <button className="bg-slate-900 text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-slate-800 shadow-lg shadow-slate-200">
                        View Statement
                    </button>
                </div>
            </div>

            {/* Financial Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <FinanceCard
                    title="Monthly Revenue"
                    value={`$${stats.totalRevenue.toLocaleString()}`}
                    sub="+8.2% vs last month"
                    icon={DollarSign}
                    variant="primary"
                />
                <FinanceCard
                    title="Occupancy Rate"
                    value={`${stats.occupancyRate}%`}
                    sub={`${stats.totalUnits} Total Units`}
                    icon={Building}
                    variant="neutral"
                />
                <FinanceCard
                    title="YTD Yield"
                    value="6.4%"
                    sub="Annualized Return"
                    icon={TrendingUp}
                    variant="success"
                />
                <FinanceCard
                    title="Pending Rent"
                    value={`$${stats.pendingRent.toLocaleString()}`}
                    sub="2 Units Late"
                    icon={AlertCircle}
                    variant="danger"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Chart */}
                <Card className="lg:col-span-2 border-none shadow-sm h-[400px]">
                    <CardHeader>
                        <CardTitle>Revenue Trends</CardTitle>
                        <CardDescription>Gross income over the last 6 months.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[320px] w-full">
                        {/* Simple placeholder for chart area if recharts not perfectly configured in environment */}
                        <div className="w-full h-full bg-slate-50 rounded-xl relative overflow-hidden flex items-end justify-between px-6 pb-0 pt-10">
                            {revenueData.map((d, i) => (
                                <div key={i} className="flex flex-col items-center gap-2 group w-full">
                                    <div
                                        className="w-[60%] bg-slate-200 rounded-t-lg transition-all duration-500 group-hover:bg-blue-500 relative"
                                        style={{ height: `${(d.revenue / 25000) * 100}%` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            ${d.revenue}
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-slate-400">{d.name}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Approvals Queue */}
                <div className="space-y-6">
                    <Card className="border-none shadow-sm h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-600" />
                                Approvals Queue
                            </CardTitle>
                            <CardDescription>Applicants pending your review.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {recentApps.filter((a: any) => a.status === 'screening').length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-sm">All caught up! No pending reviews.</div>
                            ) : (
                                recentApps.filter((a: any) => a.status === 'screening').map((app: any) => (
                                    <div key={app.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-200 transition-colors cursor-pointer">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-slate-900">{app.applicant_name}</h4>
                                                <p className="text-xs text-slate-500">{app.properties?.address}</p>
                                            </div>
                                            <Badge className="bg-indigo-100 text-indigo-700 border-none hover:bg-indigo-200">
                                                Screening
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                            <div className="bg-white p-2 rounded border border-slate-100">
                                                <span className="text-slate-400 block">Credit</span>
                                                <span className="font-bold text-slate-900">{app.credit_score || 'N/A'}</span>
                                            </div>
                                            <div className="bg-white p-2 rounded border border-slate-100">
                                                <span className="text-slate-400 block">Income</span>
                                                <span className="font-bold text-slate-900">${app.monthly_income?.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <button className="flex-1 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800">Review</button>
                                            <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-100">Decline</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function FinanceCard({ title, value, sub, icon: Icon, variant }: any) {
    const variants: any = {
        primary: "bg-blue-600 text-white sub-text-blue-100 icon-white",
        neutral: "bg-white border-slate-200 text-slate-900 sub-text-slate-500 icon-slate-400",
        success: "bg-emerald-50 border-emerald-100 text-slate-900 sub-text-emerald-600 icon-emerald-500",
        danger: "bg-white border-red-100 text-slate-900 sub-text-red-500 icon-red-500"
    };

    const isPrimary = variant === 'primary';

    return (
        <div className={`p-6 rounded-2xl shadow-sm ${isPrimary ? 'shadow-blue-200' : 'border'} ${variants[variant].split(' ')[0] || 'bg-white'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${isPrimary ? 'bg-white/10' : 'bg-slate-50'}`}>
                    <Icon className={`w-5 h-5 ${isPrimary ? 'text-white' : 'text-slate-500'}`} />
                </div>
                {variant === 'primary' && <ArrowUpRight className="w-4 h-4 text-white/50" />}
            </div>
            <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isPrimary ? 'text-blue-100' : 'text-slate-400'}`}>{title}</p>
                <h3 className={`text-2xl font-bold mb-1 ${isPrimary ? 'text-white' : 'text-slate-900'}`}>{value}</h3>
                <p className={`text-xs font-medium ${isPrimary ? 'text-blue-200' : 'text-slate-500'}`}>{sub}</p>
            </div>
        </div>
    );
}
