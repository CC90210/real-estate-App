'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCompanyId } from '@/lib/hooks/useCompanyId'
import { useAccentColor } from '@/lib/hooks/useAccentColor'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    BarChart3, TrendingUp, Home, DollarSign, Users, ClipboardList,
    CheckCircle, Clock, AlertTriangle, Loader2, ArrowUpRight, ArrowDownRight,
    Calendar, Wrench, BookOpen, Download
} from 'lucide-react'
import { FeatureGate } from '@/components/FeatureGate'

function StatCard({ label, value, icon: Icon, trend, trendLabel, color, gradient }: {
    label: string; value: string | number; icon: any; trend?: number; trendLabel?: string; color: string; gradient: string
}) {
    return (
        <Card className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden">
            <CardContent className="p-5 relative">
                <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 opacity-10", gradient)} />
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                        <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
                        {trend !== undefined && (
                            <div className="flex items-center gap-1 mt-2">
                                {trend >= 0 ? (
                                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                    <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                                )}
                                <span className={cn("text-xs font-bold", trend >= 0 ? "text-emerald-600" : "text-red-600")}>
                                    {Math.abs(trend)}%
                                </span>
                                {trendLabel && <span className="text-xs text-slate-300 ml-1">{trendLabel}</span>}
                            </div>
                        )}
                    </div>
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", color)}>
                        <Icon className="w-6 h-6" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function BarChartSimple({ data, label }: { data: { name: string; value: number; color: string }[]; label: string }) {
    const max = Math.max(...data.map(d => d.value), 1)
    return (
        <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            {data.map(item => (
                <div key={item.name} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-600 w-24 truncate">{item.name}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                        <div
                            className={cn("h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2", item.color)}
                            style={{ width: `${Math.max((item.value / max) * 100, 8)}%` }}
                        >
                            <span className="text-[10px] font-black text-white">{item.value}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

function RingChart({ segments, total, label }: {
    segments: { name: string; value: number; color: string }[];
    total: number;
    label: string;
}) {
    let offset = 0
    const circumference = 2 * Math.PI * 45

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                    {segments.map((seg, i) => {
                        const pct = total > 0 ? seg.value / total : 0
                        const dashArray = `${pct * circumference} ${circumference}`
                        const dashOffset = -offset * circumference
                        offset += pct
                        return (
                            <circle
                                key={i}
                                cx="50" cy="50" r="45"
                                fill="none"
                                stroke={seg.color}
                                strokeWidth="8"
                                strokeDasharray={dashArray}
                                strokeDashoffset={dashOffset}
                                strokeLinecap="round"
                                className="transition-all duration-500"
                            />
                        )
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900">{total}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
                </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {segments.map(seg => (
                    <div key={seg.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span className="text-[10px] font-bold text-slate-500">{seg.name} ({seg.value})</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function AnalyticsPage() {
    const supabase = createClient()
    const companyId = useCompanyId()
    const { colors } = useAccentColor()

    const { data: stats, isLoading } = useQuery({
        queryKey: ['analytics', companyId],
        queryFn: async () => {
            if (!companyId) return null

            const [properties, applications, leases, maintenance, invoices, showings] = await Promise.all([
                supabase.from('properties').select('status, rent, created_at').eq('company_id', companyId),
                supabase.from('applications').select('status, created_at').eq('company_id', companyId),
                supabase.from('leases').select('status, rent_amount, end_date, created_at').eq('company_id', companyId),
                supabase.from('maintenance_requests').select('status, priority, category, created_at').eq('company_id', companyId),
                supabase.from('invoices').select('status, total, created_at').eq('company_id', companyId),
                supabase.from('showings').select('status, created_at').eq('company_id', companyId),
            ])

            const props = properties.data || []
            const apps = applications.data || []
            const leasesData = leases.data || []
            const maint = maintenance.data || []
            const inv = invoices.data || []
            const shows = showings.data || []

            // Property status breakdown
            const propByStatus = {
                available: props.filter(p => p.status === 'available').length,
                rented: props.filter(p => p.status === 'rented').length,
                pending: props.filter(p => p.status === 'pending').length,
                maintenance: props.filter(p => p.status === 'maintenance').length,
            }

            // Revenue calculation
            const activeLeaseRevenue = leasesData
                .filter(l => ['active', 'expiring'].includes(l.status))
                .reduce((s, l) => s + (l.rent_amount || 0), 0)

            // Occupancy rate
            const totalProps = props.length || 1
            const occupancyRate = Math.round((propByStatus.rented / totalProps) * 100)

            // App pipeline
            const appPipeline = {
                new: apps.filter(a => a.status === 'new').length,
                screening: apps.filter(a => a.status === 'screening').length,
                approved: apps.filter(a => a.status === 'approved').length,
                denied: apps.filter(a => a.status === 'denied').length,
            }

            // Maintenance by category
            const maintByCategory = categories.reduce((acc, cat) => {
                acc[cat] = maint.filter(m => m.category === cat).length
                return acc
            }, {} as Record<string, number>)

            // Active maintenance
            const openMaint = maint.filter(m => !['completed', 'cancelled'].includes(m.status)).length

            return {
                totalProperties: props.length,
                totalApplications: apps.length,
                totalLeases: leasesData.length,
                activeLeases: leasesData.filter(l => l.status === 'active').length,
                expiringLeases: leasesData.filter(l => l.status === 'expiring').length,
                monthlyRevenue: activeLeaseRevenue,
                occupancyRate,
                propByStatus,
                appPipeline,
                maintByCategory,
                openMaint,
                totalInvoices: inv.length,
                paidInvoices: inv.filter(i => i.status === 'paid').length,
                invoiceRevenue: inv.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0),
                totalShowings: shows.length,
            }
        },
        enabled: !!companyId,
    })

    const categories = ['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest', 'general']

    if (isLoading || !stats) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <Loader2 className={cn("w-10 h-10 animate-spin", colors.text)} />
            </div>
        )
    }

    return (
        <FeatureGate feature="analytics" fallback={<p className="text-center text-slate-500 py-20">Upgrade your plan to access detailed analytics.</p>}>
            <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1", colors.text)}>
                            <BarChart3 className="h-3 w-3" />
                            <span>Analytics</span>
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">Portfolio Analytics</h1>
                        <p className="text-slate-500 font-medium mt-1">Performance metrics across your portfolio.</p>
                    </div>
                </div>

                {/* KPI Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Properties"
                        value={stats.totalProperties}
                        icon={Home}
                        color="bg-blue-100 text-blue-600"
                        gradient="bg-blue-500"
                    />
                    <StatCard
                        label="Monthly Revenue"
                        value={`$${stats.monthlyRevenue.toLocaleString()}`}
                        icon={DollarSign}
                        color="bg-emerald-100 text-emerald-600"
                        gradient="bg-emerald-500"
                    />
                    <StatCard
                        label="Occupancy Rate"
                        value={`${stats.occupancyRate}%`}
                        icon={TrendingUp}
                        color="bg-indigo-100 text-indigo-600"
                        gradient="bg-indigo-500"
                    />
                    <StatCard
                        label="Active Leases"
                        value={stats.activeLeases}
                        icon={BookOpen}
                        color="bg-amber-100 text-amber-600"
                        gradient="bg-amber-500"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Property Distribution */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Property Status Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center py-6">
                            <RingChart
                                total={stats.totalProperties}
                                label="Properties"
                                segments={[
                                    { name: 'Available', value: stats.propByStatus.available, color: '#3b82f6' },
                                    { name: 'Rented', value: stats.propByStatus.rented, color: '#10b981' },
                                    { name: 'Pending', value: stats.propByStatus.pending, color: '#f59e0b' },
                                    { name: 'Maintenance', value: stats.propByStatus.maintenance, color: '#ef4444' },
                                ]}
                            />
                        </CardContent>
                    </Card>

                    {/* Application Pipeline */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Application Pipeline</CardTitle>
                        </CardHeader>
                        <CardContent className="py-6">
                            <BarChartSimple
                                label=""
                                data={[
                                    { name: 'New', value: stats.appPipeline.new, color: 'bg-blue-500' },
                                    { name: 'Screening', value: stats.appPipeline.screening, color: 'bg-amber-500' },
                                    { name: 'Approved', value: stats.appPipeline.approved, color: 'bg-emerald-500' },
                                    { name: 'Denied', value: stats.appPipeline.denied, color: 'bg-red-500' },
                                ]}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-white">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
                                <Wrench className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">{stats.openMaint}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open Maintenance</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">{stats.totalShowings}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Showings</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-sky-50 to-white">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center">
                                <ClipboardList className="w-6 h-6 text-sky-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">{stats.totalApplications}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Applications</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-white">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-rose-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">{stats.expiringLeases}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiring Leases</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Invoice Summary */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Invoice Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="py-6">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-3xl font-black text-slate-900">{stats.totalInvoices}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Total</p>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-emerald-600">{stats.paidInvoices}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Paid</p>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900">${stats.invoiceRevenue.toLocaleString()}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Revenue</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </FeatureGate>
    )
}
