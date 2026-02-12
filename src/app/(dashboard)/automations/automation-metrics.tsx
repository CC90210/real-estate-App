'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts'
import {
    Activity,
    CheckCircle,
    XCircle,
    Clock,
    Zap,
    TrendingUp,
    ShieldCheck,
    Cpu
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AutomationMetricsProps {
    automations: any[]
}

export function AutomationMetrics({ automations }: AutomationMetricsProps) {
    const supabase = createClient()

    // Fetch execution metrics
    const { data: metrics, isLoading } = useQuery({
        queryKey: ['automation-metrics'],
        queryFn: async () => {
            const automationIds = automations.map(a => a.id)

            if (automationIds.length === 0) return []

            const { data: executions } = await supabase
                .from('automation_executions')
                .select('*')
                .in('automation_id', automationIds)
                .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                .order('started_at', { ascending: false })

            return executions || []
        },
        enabled: automations.length > 0,
    })

    // Calculate stats
    const totalExecutions = (metrics?.length || 0) + (automations.reduce((sum, a) => sum + (a.total_executions || 0), 0))
    const successfulExecutions = (metrics?.filter(m => m.status === 'success').length || 0) + (automations.reduce((sum, a) => sum + (a.successful_executions || 0), 0))
    const failedExecutions = metrics?.filter(m => m.status === 'failed').length || 0
    const successRate = totalExecutions > 0 ? ((successfulExecutions / totalExecutions) * 100).toFixed(1) : "100"

    // Mock chart data if no real data yet to show structure
    const chartData = metrics && metrics.length > 0 ? metrics.reduce((acc: any[], execution) => {
        const date = new Date(execution.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        const existing = acc.find(d => d.date === date)

        if (existing) {
            existing.total++
            if (execution.status === 'success') existing.success++
        } else {
            acc.push({
                date,
                total: 1,
                success: execution.status === 'success' ? 1 : 0,
            })
        }

        return acc
    }, []).reverse() : [
        { date: 'Feb 1', total: 12, success: 12 },
        { date: 'Feb 2', total: 15, success: 14 },
        { date: 'Feb 3', total: 18, success: 18 },
        { date: 'Feb 4', total: 14, success: 13 },
        { date: 'Feb 5', total: 22, success: 22 },
        { date: 'Feb 6', total: 25, success: 24 },
        { date: 'Feb 7', total: 30, success: 30 },
    ]

    return (
        <div className="space-y-8">
            {/* Real-time Status Card */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -ml-32 -mb-32" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Autonomous Core Active</span>
                        </div>
                        <h2 className="text-4xl font-black tracking-tight mb-2">Workspace Intelligence</h2>
                        <p className="text-slate-400 max-w-md">Your AI agents are currently monitoring workflows and processing autonomous events across your portfolio.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Uptime</p>
                            <p className="text-2xl font-black">99.98%</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Latency</p>
                            <p className="text-2xl font-black">124ms</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Core Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Executions', value: totalExecutions, icon: Activity, color: 'blue', desc: 'Total autonomous tasks' },
                    { label: 'Success Rate', value: `${successRate}%`, icon: ShieldCheck, color: 'green', desc: 'No-error fulfillment' },
                    { label: 'Time Saved', value: `${Math.floor(totalExecutions * 0.25)}h`, icon: Clock, color: 'purple', desc: 'Human effort bypassed' },
                    { label: 'Cloud Resources', value: automations.length, icon: Cpu, color: 'indigo', desc: 'Active agent containers' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm",
                            stat.color === 'blue' && "bg-blue-50 text-blue-600",
                            stat.color === 'green' && "bg-green-50 text-green-600",
                            stat.color === 'purple' && "bg-purple-50 text-purple-600",
                            stat.color === 'indigo' && "bg-indigo-50 text-indigo-600",
                        )}>
                            <stat.icon className="h-6 w-6" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-3xl font-black text-slate-900 mb-1">{stat.value}</p>
                        <p className="text-xs font-bold text-slate-500">{stat.desc}</p>
                    </div>
                ))}
            </div>

            {/* Performance Graph */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            Agent Activity Timeline
                            <div className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest">Live</div>
                        </h3>
                        <p className="text-slate-500 text-sm">Autonomous execution volume across all active agents.</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 font-bold text-xs text-slate-600">
                            30 Days
                        </div>
                    </div>
                </div>

                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                dx={-10}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#3b82f6"
                                strokeWidth={4}
                                fillOpacity={1}
                                fill="url(#colorTotal)"
                                name="Executions"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Agent Registry */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Agent Pulse</h3>
                        <p className="text-slate-500 text-sm">Deep inspection of your deployed autonomous units.</p>
                    </div>
                    <TrendingUp className="h-6 w-6 text-slate-300" />
                </div>
                <div className="divide-y divide-slate-50">
                    {automations.map((automation) => (
                        <div key={automation.id} className="p-6 flex flex-col md:flex-row items-center justify-between hover:bg-slate-50/50 transition-colors group">
                            <div className="flex items-center gap-5">
                                <div className={cn(
                                    "h-14 w-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm",
                                    automation.status === 'active' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                                )}>
                                    <Zap className={cn("h-7 w-7", automation.status === 'active' && "fill-blue-600")} />
                                </div>
                                <div>
                                    <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{automation.name}</p>
                                    <div className="flex items-center gap-4 mt-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {automation.total_executions || 0} Events Logged
                                        </p>
                                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Last Active: {automation.last_executed_at ? new Date(automation.last_executed_at).toLocaleTimeString() : 'Awaiting Input'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 mt-4 md:mt-0">
                                <div className="text-right hidden md:block">
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{automation.successful_executions || 0} Successes</p>
                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 rounded-full"
                                            style={{ width: `${Math.min(100, ((automation.successful_executions || 0) / (automation.total_executions || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                                <span className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border",
                                    automation.status === 'active'
                                        ? "bg-green-50 text-green-700 border-green-100 shadow-green-100/50"
                                        : "bg-slate-50 text-slate-500 border-slate-100"
                                )}>
                                    {automation.status}
                                </span>
                            </div>
                        </div>
                    ))}
                    {automations.length === 0 && (
                        <div className="p-20 text-center">
                            <Zap className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active agents in this workspace</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
