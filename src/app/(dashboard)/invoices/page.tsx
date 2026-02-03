'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, FileText, DollarSign, Clock, CheckCircle, Receipt, ArrowRight } from 'lucide-react'
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
            // Note: Ensure your schema has company_id RLS enabled or filter here
            const { data } = await supabase
                .from('invoices')
                .select(`
                    *,
                    property:properties(address),
                    landlord:landlords(name)
                `)
                .order('created_at', { ascending: false })
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
            <div className="p-10 space-y-8">
                <div className="flex justify-between">
                    <Skeleton className="h-10 w-48 rounded-xl" />
                    <Skeleton className="h-10 w-32 rounded-xl" />
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-10 space-y-10 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1", colors.text)}>
                        <Receipt className="h-3 w-3" />
                        <span>Financial Operations</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Invoices</h1>
                    <p className="text-slate-500 font-medium">
                        Billing and accounts receivable ({invoices?.length || 0} records)
                    </p>
                </div>
                <Link href="/invoices/new">
                    <Button className={cn("h-14 px-8 text-white rounded-2xl shadow-xl gap-2 font-bold transition-all hover:scale-105 active:scale-95", colors.bg, `hover:${colors.bgHover}`, colors.shadow)}>
                        <Plus className="h-4 w-4" />
                        Create Invoice
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <StatCard
                    label="Outstanding"
                    value={`$${invoices?.filter(i => i.status === 'sent').reduce((sum, i) => sum + Number(i.total), 0).toLocaleString() || '0'}`}
                    icon={DollarSign}
                    color={colors.text}
                    bg={colors.bgLight}
                />
                <StatCard
                    label="Collected (Month)"
                    value={`$${invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.total), 0).toLocaleString() || '0'}`}
                    icon={CheckCircle}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <StatCard
                    label="Pending Action"
                    value={invoices?.filter(i => i.status === 'sent').length || 0}
                    icon={Clock}
                    color="text-amber-600"
                    bg="bg-amber-50"
                />
                <StatCard
                    label="Overdue Alerts"
                    value={invoices?.filter(i => i.status === 'overdue').length || 0}
                    icon={FileText}
                    color="text-red-600"
                    bg="bg-red-50"
                />
            </div>

            {/* Invoices List */}
            {!invoices || invoices.length === 0 ? (
                <div className="col-span-full py-20 bg-white/50 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                        <Receipt className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">No invoices generated</h3>
                    <p className="text-slate-500 font-medium mt-2 mb-8">Create your first invoice to start tracking payments.</p>
                    <Link href="/invoices/new">
                        <Button variant="outline" className="rounded-xl border-slate-300 font-bold text-slate-600 hover:bg-slate-50">Draft First Invoice</Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {invoices.map(invoice => {
                        // @ts-ignore
                        const status = statusConfig[invoice.status] || statusConfig.draft
                        return (
                            <Link href={`/invoices/${invoice.id}`} key={invoice.id} className="block group">
                                <Card className="border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 rounded-[2rem] group-hover:-translate-y-1">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center font-bold text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="font-mono font-bold text-slate-900">
                                                            #{invoice.invoice_number}
                                                        </span>
                                                        <Badge variant="outline" className={`rounded-lg px-2 py-0.5 font-bold uppercase text-[10px] tracking-wider ${status.color}`}>
                                                            {status.label}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                                        <span>{invoice.recipient_name}</span>
                                                        {invoice.property?.address && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                                <span>{invoice.property.address}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8">
                                                <div className="text-right">
                                                    <p className="text-xl font-black text-slate-900">
                                                        ${Number(invoice.total).toLocaleString()}
                                                    </p>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                        Due {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    <ArrowRight className="w-5 h-5" />
                                                </div>
                                            </div>
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

function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: string | number; icon: any; color: string; bg: string }) {
    return (
        <Card className="border-none shadow-lg rounded-[2rem] overflow-hidden">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center`}>
                    <Icon className="h-6 w-6" />
                </div>
            </CardContent>
        </Card>
    )
}
