'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, FileText, DollarSign, Clock, CheckCircle, Receipt, ArrowRight, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { useAccentColor } from '@/lib/hooks/useAccentColor'
import { cn } from '@/lib/utils'

export default function InvoicesPage() {
    const supabase = createClient()
    const { colors } = useAccentColor()

    const { data: invoices, isLoading } = useQuery({
        queryKey: ['invoices'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    *,
                    property:properties(address),
                    landlord:landlords(name)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data || []
        }
    })

    const statusConfig = {
        draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200' },
        sent: { label: 'Sent', color: 'bg-blue-50 text-blue-600 border-blue-100' },
        paid: { label: 'Paid', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        overdue: { label: 'Overdue', color: 'bg-red-50 text-red-600 border-red-100' },
        cancelled: { label: 'Cancelled', color: 'bg-slate-50 text-slate-400 border-slate-100' }
    }

    if (isLoading) {
        return (
            <div className="p-10 space-y-8 animate-pulse text-slate-200">
                <div className="flex justify-between items-center">
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-64 rounded-2xl" />
                        <Skeleton className="h-4 w-48 rounded-lg" />
                    </div>
                    <Skeleton className="h-14 w-48 rounded-2xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-[2.5rem]" />)}
                </div>
                <div className="space-y-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-[2.5rem]" />)}
                </div>
            </div>
        )
    }

    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const totalOutstanding = invoices?.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + Number(i.total || 0), 0) || 0
    const totalCollected = invoices?.filter(i => {
        const paidDate = new Date(i.updated_at || i.created_at)
        return i.status === 'paid' && paidDate >= currentMonthStart
    }).reduce((sum, i) => sum + Number(i.total || 0), 0) || 0

    return (
        <div className="p-6 lg:p-10 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="space-y-2">
                    <div className={cn("flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.3em] mb-1", colors.text)}>
                        <Receipt className="h-4 w-4" />
                        <span>Financial Operations Console</span>
                    </div>
                    <h1 className="text-6xl font-black tracking-tighter text-slate-900 leading-none">Invoices</h1>
                    <p className="text-slate-500 font-bold text-lg mt-4">
                        Tracking {invoices?.length || 0} financial records across properties.
                    </p>
                </div>
                <Link href="/invoices/new">
                    <Button className={cn("h-16 px-10 text-white rounded-[1.5rem] shadow-2xl gap-3 font-black uppercase tracking-[0.2em] text-[11px] transition-all hover:scale-105 active:scale-95 group", colors.bg, `hover:${colors.bgHover}`, colors.shadow)}>
                        <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
                        Create New Invoice
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    label="Outstanding"
                    value={`$${totalOutstanding.toLocaleString()}`}
                    icon={Clock}
                    color="text-amber-600"
                    bg="bg-amber-50"
                    trend="+12% from last month"
                />
                <StatCard
                    label="Collected (Month)"
                    value={`$${totalCollected.toLocaleString()}`}
                    icon={CheckCircle}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                    trend="Target: $250,000"
                />
                <StatCard
                    label="Processing"
                    value={invoices?.filter(i => i.status === 'draft').length.toString() || '0'}
                    icon={TrendingUp}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StatCard
                    label="Critical Alerts"
                    value={invoices?.filter(i => i.status === 'overdue').length.toString() || '0'}
                    icon={AlertCircle}
                    color="text-rose-600"
                    bg="bg-rose-50"
                />
            </div>

            {/* Invoices List */}
            {!invoices || invoices.length === 0 ? (
                <div className="py-32 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center px-6 animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-8">
                        <FileText className="w-12 h-12 text-slate-200" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Zero Invoices</h3>
                    <p className="text-slate-500 font-bold mt-4 mb-10 max-w-md">No financial records detected in the ledger. Generate your first invoice to initialize tracking.</p>
                    <Link href="/invoices/new">
                        <Button className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl">Draft First Invoice</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {invoices.map(invoice => {
                        const status = statusConfig[invoice.status as keyof typeof statusConfig] || statusConfig.draft
                        const isOverdue = invoice.status === 'overdue'

                        return (
                            <Link href={`/invoices/${invoice.id}`} key={invoice.id} className="block group">
                                <Card className={cn(
                                    "border-none shadow-xl hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] transition-all duration-500 rounded-[2.5rem] overflow-hidden group-hover:-translate-y-2",
                                    isOverdue ? "ring-2 ring-rose-100" : ""
                                )}>
                                    <CardContent className="p-0">
                                        <div className="flex items-center justify-between p-8">
                                            <div className="flex items-center gap-8">
                                                <div className="h-20 w-20 rounded-[1.5rem] bg-slate-50 flex items-center justify-center font-bold text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner group-hover:rotate-6 group-hover:scale-110">
                                                    <FileText className="w-8 h-8" />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-mono font-black text-slate-900 text-xl tracking-tighter">
                                                            #{invoice.invoice_number}
                                                        </span>
                                                        <Badge className={cn("rounded-lg px-3 py-1 font-black uppercase text-[10px] tracking-widest border-none shadow-sm", status.color)}>
                                                            {status.label}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm font-bold text-slate-500 uppercase tracking-widest">
                                                        <span>{invoice.recipient_name}</span>
                                                        {invoice.property?.address && (
                                                            <>
                                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                                <span className="text-slate-400 truncate max-w-[300px]">{invoice.property.address}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-12">
                                                <div className="text-right">
                                                    <p className="text-4xl font-black text-slate-900 tracking-tighter">
                                                        ${Number(invoice.total || 0).toLocaleString()}
                                                    </p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">
                                                        Due {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Upon Receipt'}
                                                    </p>
                                                </div>
                                                <div className="h-14 w-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 shadow-sm border border-slate-100 group-hover:scale-110 group-hover:-rotate-45">
                                                    <ArrowRight className="w-6 h-6" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Progress Bar */}
                                        <div className="h-1.5 w-full bg-slate-50 overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full transition-all duration-1000",
                                                    invoice.status === 'paid' ? "bg-emerald-400 w-full" :
                                                        invoice.status === 'sent' ? "bg-blue-400 w-2/3" :
                                                            invoice.status === 'overdue' ? "bg-rose-500 w-full animate-pulse" : "bg-slate-200 w-1/4"
                                                )}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function StatCard({ label, value, icon: Icon, color, bg, trend, isAlert }: { label: string; value: string | number; icon: any; color: string; bg: string; trend?: string; isAlert?: boolean }) {
    return (
        <Card className={cn(
            "border-none shadow-xl rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:scale-[1.02]",
            isAlert && Number(value) > 0 ? "ring-4 ring-rose-50 bg-white" : "bg-white"
        )}>
            <CardContent className="p-8 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-8">
                    <div className={cn("w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-lg", bg, color)}>
                        <Icon className="h-6 w-6" />
                    </div>
                    {trend && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                            {trend}
                        </span>
                    )}
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">{label}</p>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter">{value}</p>
                </div>
            </CardContent>
        </Card>
    )
}
