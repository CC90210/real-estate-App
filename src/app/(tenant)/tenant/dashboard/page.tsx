'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Calendar,
    CreditCard,
    FileText,
    Wrench,
    Info,
    LayoutDashboard,
    MessageSquare,
    Settings,
    LogOut,
    Home,
    Bell,
    ArrowRight, // Kept from original, not in instruction's new list but likely needed
    Loader2, // Kept from original, not in instruction's new list but likely needed
    CheckCircle2, // Kept from original, not in instruction's new list but likely needed
    Clock, // Kept from original, not in instruction's new list but likely needed
    AlertCircle, // Kept from original, not in instruction's new list but likely needed
    Activity // Kept from original, not in instruction's new list but likely needed
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Lease, MaintenanceRequest } from '@/types/database'

export default function TenantDashboard() {
    const supabase = createClient()

    // 1. Fetch Tenant Lease & Property
    const { data: lease, isLoading: isLoadingLease } = useQuery({
        queryKey: ['tenant-lease'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            const { data, error } = await supabase
                .from('leases')
                .select('*, property:properties(*)')
                .eq('tenant_id', user.id)
                .eq('status', 'active')
                .maybeSingle()

            if (error) throw error
            return data as Lease & { property: any }
        }
    })

    // 2. Fetch Active Maintenance Requests
    const { data: maintenance, isLoading: isLoadingMaintenance } = useQuery({
        queryKey: ['tenant-maintenance'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return []

            const { data, error } = await supabase
                .from('maintenance_requests')
                .select('*')
                .eq('submitted_by', user.id)
                .neq('status', 'completed')
                .neq('status', 'cancelled')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as MaintenanceRequest[]
        }
    })

    const handlePayRent = async () => {
        if (!lease) return

        try {
            const res = await fetch('/api/stripe/checkout/rent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leaseId: lease.id }),
            })

            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            } else {
                throw new Error(data.error || 'Failed to start payment')
            }
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    if (isLoadingLease || isLoadingMaintenance) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
        )
    }

    const daysUntilNextPayment = lease ? differenceInDays(new Date(2026, 2, lease.payment_day), new Date()) : 0; // Mocking specific month for demo

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Simple Greeting */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                        Welcome Home.
                    </h1>
                    <p className="text-lg font-medium text-slate-500">
                        {lease?.property?.address || "You don't have an active lease currently."}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="rounded-xl font-bold border-slate-200">
                        <Info className="w-4 h-4 mr-2" /> Help Center
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* PAYMENT SECTION (MOST IMPORTANT) */}
                <Card className="lg:col-span-2 border-0 shadow-2xl shadow-blue-500/10 bg-white overflow-hidden rounded-[2rem]">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-2">Next Rent Payment</h3>
                                <p className="text-5xl font-black tracking-tighter">
                                    ${lease?.rent_amount.toLocaleString() || "0.00"}
                                </p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Due In</p>
                                <p className="text-2xl font-black text-white">{daysUntilNextPayment} Days</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button
                                onClick={handlePayRent}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl h-14 text-lg font-black shadow-lg shadow-blue-600/20"
                            >
                                <CreditCard className="w-5 h-5 mr-3" /> Pay Rent Online
                            </Button>
                            <Button variant="ghost" className="flex-1 text-white hover:bg-white/10 rounded-2xl h-14 font-bold border border-white/20">
                                View History
                            </Button>
                        </div>
                    </div>
                    <CardContent className="p-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date</p>
                                <p className="font-black text-slate-900">March {lease?.payment_day || 1}, 2026</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Utilities</p>
                                <p className="font-black text-slate-900">$0.00 (Included)</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</p>
                                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold">Scheduled</Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Auto-Pay</p>
                                <p className="font-black text-slate-900">{lease?.auto_renew ? "Active" : "Disabled"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* LEASE QUICK INFO */}
                <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] flex flex-col">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <FileText className="w-5 h-5 text-slate-400" /> Lease Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 flex-1 flex flex-col">
                        <div className="space-y-6 flex-1">
                            <div className="flex items-center gap-4 transition-all hover:translate-x-1">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                                    <Calendar className="w-6 h-6 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lease Ends</p>
                                    <p className="font-black text-slate-900">{lease ? format(new Date(lease.end_date), 'MMM d, yyyy') : 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 transition-all hover:translate-x-1">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                                    <Home className="w-6 h-6 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deposit Held</p>
                                    <p className="font-black text-slate-900">${lease?.deposit_amount.toLocaleString() || '0'}</p>
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" asChild className="w-full mt-8 rounded-2xl border-2 border-slate-50 font-black text-slate-500 hover:text-slate-900 hover:bg-slate-50 h-14">
                            <Link href="/tenant/lease">
                                View Full Lease <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* MAINTENANCE GRID */}
            <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Wrench className="w-6 h-6 text-slate-400" />
                        Maintenance Requests
                        {maintenance && maintenance.length > 0 && (
                            <Badge className="bg-slate-100 text-slate-600 font-black ml-2">{maintenance.length} Active</Badge>
                        )}
                    </h2>
                    <Button className="rounded-xl font-bold bg-slate-900 text-white px-6 h-11" asChild>
                        <Link href="/tenant/maintenance">New Request</Link>
                    </Button>
                </div>

                {maintenance && maintenance.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {maintenance.map((req) => (
                            <Card key={req.id} className="border-0 shadow-lg shadow-slate-200/50 bg-white rounded-3xl overflow-hidden hover:shadow-xl transition-all cursor-pointer group">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <Badge className={cn(
                                            "capitalize font-bold border-0",
                                            req.status === 'open' ? "bg-blue-50 text-blue-600" :
                                                req.status === 'in_progress' ? "bg-amber-50 text-amber-600" :
                                                    req.status === 'scheduled' ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-600"
                                        )}>
                                            {req.status === 'open' ? <Clock className="w-3 h-3 mr-1" /> : <Activity className="w-3 h-3 mr-1" />}
                                            {req.status.replace('_', ' ')}
                                        </Badge>
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{req.id.slice(0, 8)}</p>
                                    </div>
                                    <h4 className="text-lg font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{req.title}</h4>
                                    <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-4">{req.description}</p>
                                    <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                                        <p className="text-xs font-bold text-slate-400">
                                            {format(new Date(req.created_at), 'MMMM d')}
                                        </p>
                                        <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-16 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
                        <div className="p-4 bg-white rounded-3xl shadow-sm mb-4">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-1">No active repairs</h3>
                        <p className="text-slate-500 font-medium">Everything is looking good in your unit.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
