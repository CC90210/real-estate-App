'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Users,
    Building2,
    TrendingUp,
    CreditCard,
    Settings,
    ShieldAlert,
    Loader2,
    ArrowUpRight,
    Activity,
    Mail
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

export default function PlatformAdminPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const res = await fetch('/api/admin/stats')
            if (!res.ok) throw new Error('Failed to fetch stats')
            return res.json()
        }
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        )
    }

    const { stats, recentSignups } = data

    return (
        <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-slate-900 rounded-lg">
                            <ShieldAlert className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Platform Intelligence</h1>
                    </div>
                    <p className="text-slate-500 font-medium">Control center for the PropFlow network.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="font-bold">
                        <Settings className="w-4 h-4 mr-2" /> Global Settings
                    </Button>
                    <Button className="bg-slate-900 hover:bg-slate-800 font-bold">
                        <Activity className="w-4 h-4 mr-2" /> Node Status
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-50 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex items-center text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full">
                                <ArrowUpRight className="w-3 h-3 mr-1" /> 12%
                            </div>
                        </div>
                        <h3 className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Total Users</h3>
                        <p className="text-3xl font-black text-slate-900">{stats.totalUsers}</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-50 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                                <Building2 className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div className="flex items-center text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full">
                                <ArrowUpRight className="w-3 h-3 mr-1" /> 8%
                            </div>
                        </div>
                        <h3 className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Active Orgs</h3>
                        <p className="text-3xl font-black text-slate-900">{stats.totalCompanies}</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-emerald-50 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                                <TrendingUp className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div className="flex items-center text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full">
                                <ArrowUpRight className="w-3 h-3 mr-1" /> 24%
                            </div>
                        </div>
                        <h3 className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Prop Managed</h3>
                        <p className="text-3xl font-black text-slate-900">{stats.totalProperties}</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-amber-50 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                                <CreditCard className="w-6 h-6 text-amber-600" />
                            </div>
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 font-black">PRO</Badge>
                        </div>
                        <h3 className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">MRR (EST)</h3>
                        <p className="text-3xl font-black text-slate-900">${((stats.plansCount?.professional || 0) * 49 + (stats.plansCount?.enterprise || 0) * 199).toLocaleString()}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity */}
                <Card className="border-0 shadow-xl shadow-slate-200/40 overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
                        <CardTitle className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-slate-400" /> Recent Onboarding
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {recentSignups.map((user: any) => (
                                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500">
                                            {user.full_name?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 leading-none mb-1">{user.full_name}</p>
                                            <p className="text-xs font-bold text-slate-500 flex items-center">
                                                <Building2 className="w-3 h-3 mr-1" /> {user.companies?.name || 'No Company'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-slate-900 mb-1 capitalize tracking-wide">{user.role}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {formatDistanceToNow(new Date(user.created_at))} ago
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-50/30 text-center">
                            <Button variant="ghost" className="text-slate-400 hover:text-slate-900 font-black uppercase tracking-widest text-xs">
                                View Full Directory
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Network Distribution */}
                <Card className="border-0 shadow-xl shadow-slate-200/40">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
                        <CardTitle className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-slate-400" /> Plan Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="space-y-6">
                            {['essentials', 'professional', 'enterprise'].map((plan) => {
                                const count = stats.plansCount[plan] || 0
                                const percentage = (count / stats.totalCompanies) * 100
                                const colors: any = {
                                    essentials: 'bg-slate-100 text-slate-600',
                                    professional: 'bg-blue-100 text-blue-600',
                                    enterprise: 'bg-indigo-100 text-indigo-600'
                                }
                                return (
                                    <div key={plan} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">{plan}</span>
                                            <span className="text-sm font-black text-slate-900">{count} Orgs</span>
                                        </div>
                                        <div className="h-4 bg-slate-50 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full opacity-80 ${colors[plan].split(' ')[0]} transition-all duration-1000`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="mt-12 p-6 bg-slate-900 rounded-3xl text-white">
                            <h4 className="font-black text-lg mb-2">Platform Health</h4>
                            <p className="text-slate-400 text-sm font-medium mb-6">All systems operational across 4 regions. API latency averaging 42ms.</p>
                            <div className="flex gap-4">
                                <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Queue Size</p>
                                    <p className="text-xl font-black">0 Items</p>
                                </div>
                                <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Errors (24h)</p>
                                    <p className="text-xl font-black text-emerald-500">None</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
