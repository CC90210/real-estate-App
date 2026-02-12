'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    FileText,
    Download,
    Calendar,
    DollarSign,
    User,
    ShieldCheck,
    Building2,
    ArrowLeft,
    Loader2,
    MapPin,
    Clock,
    CheckCircle2,
    AlertTriangle
} from 'lucide-react'
import { format, differenceInMonths, parseISO } from 'date-fns'
import Link from 'next/link'
import { Lease } from '@/types/database'

export default function TenantLeasePage() {
    const supabase = createClient()

    const { data: lease, isLoading } = useQuery({
        queryKey: ['tenant-full-lease'],
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
        )
    }

    if (!lease) {
        return (
            <div className="p-10 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="p-6 bg-slate-50 rounded-[2.5rem] mb-6">
                    <FileText className="w-16 h-16 text-slate-200" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 mb-2">No active lease found</h1>
                <p className="text-slate-500 font-medium max-w-md mb-8">
                    We couldn't find an active lease associated with your account. Please contact your property manager if you believe this is an error.
                </p>
                <Button asChild className="rounded-2xl h-14 px-8 font-black bg-slate-900">
                    <Link href="/tenant/dashboard">Return to Dashboard</Link>
                </Button>
            </div>
        )
    }

    const leaseDuration = differenceInMonths(parseISO(lease.end_date), parseISO(lease.start_date))

    return (
        <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <Badge className="bg-emerald-50 text-emerald-600 font-bold mb-4 border-0 px-4 py-1.5 rounded-full">
                        <ShieldCheck className="w-3 h-3 mr-1" /> Active Agreement
                    </Badge>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Lease Agreement</h1>
                    <p className="text-lg font-medium text-slate-500 mt-2 flex items-center gap-2">
                        <MapPin className="w-5 h-5" /> {lease.property?.address}
                    </p>
                </div>
                <div className="flex gap-4">
                    {lease.lease_document_url && (
                        <Button className="rounded-2xl h-14 px-8 bg-blue-600 hover:bg-blue-500 text-white font-black shadow-xl shadow-blue-600/20">
                            <Download className="w-5 h-5 mr-3" /> Download PDF
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Terms */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
                            <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                                <Clock className="w-5 h-5 text-slate-400" /> Agreement Terms
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-8">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-blue-50 rounded-2xl">
                                            <Calendar className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Lease Start</p>
                                            <p className="text-xl font-black text-slate-900">{format(parseISO(lease.start_date), 'MMMM d, yyyy')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 text-amber-600">
                                        <div className="p-3 bg-amber-50 rounded-2xl">
                                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-amber-400 mb-1">Lease End</p>
                                            <p className="text-xl font-black">{format(parseISO(lease.end_date), 'MMMM d, yyyy')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-8">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-slate-50 rounded-2xl">
                                            <Building2 className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Total Duration</p>
                                            <p className="text-xl font-black text-slate-900">{leaseDuration} Months</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-slate-50 rounded-2xl">
                                            <ShieldCheck className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
                                            <p className="text-xl font-black text-slate-900 capitalize">{lease.status}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 p-8 bg-blue-600 rounded-[2rem] text-white">
                                <h3 className="text-lg font-black mb-1">Auto-Renewal</h3>
                                <p className="text-blue-100 font-medium text-sm mb-6">
                                    {lease.auto_renew
                                        ? `Your lease is set to auto-renew. We will notify you ${lease.renewal_notice_days} days before expiry.`
                                        : "Your lease is currently not set to auto-renew. Contact us at least 60 days before expiry to discuss extension."
                                    }
                                </p>
                                <Button variant="ghost" className="text-white hover:bg-white/10 font-bold rounded-xl border border-white/20">
                                    Change Renewal Settings
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-[2.5rem]">
                        <CardHeader className="p-8">
                            <CardTitle className="text-xl font-black text-slate-900">Important Clauses</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-4">
                            {[
                                "Rent is due on the " + lease.payment_day + "th of each month.",
                                "A late fee of $50 applies after 5 days of delinquency.",
                                "Tenant is responsible for standard unit maintenance.",
                                "No subletting without written approval from management.",
                                "Pets must be registered and approved by the property owner."
                            ].map((clause, i) => (
                                <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                                    <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-[10px] font-black">{i + 1}</span>
                                    </div>
                                    <p className="text-slate-600 font-medium">{clause}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Financials */}
                <div className="space-y-8">
                    <Card className="border-0 shadow-2xl shadow-blue-500/10 bg-slate-900 rounded-[2.5rem] overflow-hidden text-white">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-lg font-black tracking-widest uppercase text-slate-500">Monthly Rent</CardTitle>
                            <div className="pt-4 flex items-end gap-2">
                                <span className="text-6xl font-black tracking-tighter">${lease.rent_amount.toLocaleString()}</span>
                                <span className="text-slate-500 font-black mb-2 uppercase tracking-widest">/ Month</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <span className="text-slate-400 font-bold">Base Rent</span>
                                    <span className="font-black text-lg">${lease.rent_amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <span className="text-slate-400 font-bold">Utilities</span>
                                    <span className="font-black text-lg">$0</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
                                    <span className="font-bold">Total Monthly</span>
                                    <span className="font-black text-xl">${lease.rent_amount.toLocaleString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Deposits Held</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                            <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-[2rem]">
                                <div className="p-3 bg-white rounded-2xl shadow-sm">
                                    <ShieldCheck className="w-8 h-8 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-slate-900">${lease.deposit_amount.toLocaleString()}</p>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Security Deposit</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 font-medium mt-4 px-2 italic">
                                * Security deposit is held in a secure escrow account until lease termination.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Management</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black">PF</div>
                                <div>
                                    <p className="text-sm font-black text-slate-900">PropFlow Management</p>
                                    <p className="text-xs text-slate-500 font-medium">Verified Property Manager</p>
                                </div>
                            </div>
                            <Button variant="outline" className="w-full rounded-2xl h-12 font-bold border-slate-200">
                                Contact Property Manager
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
