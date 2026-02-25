'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export default function AdminOverviewPage() {
    const supabase = createClient()

    const { data: metrics, isLoading } = useQuery({
        queryKey: ['platform-metrics'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_platform_metrics')
            if (error) throw error
            return data
        },
        refetchInterval: 30000,
    })

    if (isLoading) return <AdminSkeleton />

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Platform Overview</h1>
                <p className="text-gray-500 font-medium">Auto-refreshing every 30s</p>
            </div>

            {/* Top-level KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard label="Total Companies" value={metrics?.total_companies || 0} />
                <MetricCard label="Total Users" value={metrics?.total_users || 0} />
                <MetricCard label="Total Properties" value={metrics?.total_properties || 0} />
                <MetricCard label="Est. Monthly MRR" value={`$${(metrics?.mrr_estimate || 0).toLocaleString()}`} highlight />
            </div>

            {/* Subscription breakdown */}
            <div className="bg-white rounded-[2rem] border shadow-sm p-8 space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Subscription Status</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatusCard label="Active" count={metrics?.subscriptions?.active || 0} color="green" />
                    <StatusCard label="Trialing" count={metrics?.subscriptions?.trialing || 0} color="blue" />
                    <StatusCard label="Enterprise" count={metrics?.subscriptions?.enterprise || 0} color="purple" />
                    <StatusCard label="Cancelled" count={metrics?.subscriptions?.cancelled || 0} color="red" />
                    <StatusCard label="No Plan" count={metrics?.subscriptions?.none || 0} color="gray" />
                </div>
            </div>

            {/* Plan distribution */}
            <div className="bg-white rounded-[2rem] border shadow-sm p-8 space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Plan Distribution</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <PlanCard plan="Agent Pro" count={metrics?.plans?.agent_pro || 0} price="$149" />
                    <PlanCard plan="Agency Growth" count={metrics?.plans?.agency_growth || 0} price="$289" />
                    <PlanCard plan="Brokerage Command" count={metrics?.plans?.brokerage_command || 0} price="$499" />
                    <PlanCard plan="Enterprise Override" count={metrics?.plans?.enterprise || 0} price="Custom" />
                </div>
            </div>

            {/* Recent activity */}
            <div className="bg-white rounded-[2rem] border shadow-sm p-8 space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Last 30 Days</h2>
                <div className="grid grid-cols-2 gap-6">
                    <MetricCard label="New Companies Added" value={metrics?.recent?.new_companies_30d || 0} />
                    <MetricCard label="New User Signups" value={metrics?.recent?.new_users_30d || 0} />
                </div>
            </div>
        </div>
    )
}

function MetricCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
    return (
        <div className={`rounded-3xl border p-6 shadow-sm transition-transform hover:scale-[1.02] ${highlight ? 'bg-green-50/50 border-green-200' : 'bg-white'}`}>
            <p className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">{label}</p>
            <p className={`text-4xl font-black ${highlight ? 'text-green-600' : 'text-gray-900'}`}>{value}</p>
        </div>
    )
}

function StatusCard({ label, count, color }: { label: string; count: number; color: string }) {
    const colorMap: Record<string, string> = {
        green: 'bg-green-100 text-green-700',
        blue: 'bg-blue-100 text-blue-700',
        purple: 'bg-purple-100 text-purple-700',
        red: 'bg-red-100 text-red-700',
        gray: 'bg-gray-100 text-gray-700',
    }
    return (
        <div className={`rounded-2xl p-5 ${colorMap[color]} shadow-sm`}>
            <p className="text-sm font-black uppercase tracking-widest opacity-80 mb-1">{label}</p>
            <p className="text-3xl font-black">{count}</p>
        </div>
    )
}

function PlanCard({ plan, count, price }: { plan: string; count: number; price: string }) {
    return (
        <div className="rounded-2xl border p-5 shadow-sm bg-gray-50/50">
            <p className="text-sm font-bold text-gray-500 mb-1">{plan}</p>
            <p className="text-3xl font-black text-gray-900">{count}</p>
            <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-wide">{price}/mo</p>
        </div>
    )
}

function AdminSkeleton() {
    return (
        <div className="animate-pulse space-y-8">
            <div className="h-10 bg-gray-200 rounded-xl w-64" />
            <div className="grid grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-3xl" />)}
            </div>
            <div className="h-48 bg-gray-200 rounded-3xl" />
            <div className="h-48 bg-gray-200 rounded-3xl" />
        </div>
    )
}
