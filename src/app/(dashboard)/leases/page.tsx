'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCompanyId } from '@/lib/hooks/useCompanyId'
import { useAccentColor } from '@/lib/hooks/useAccentColor'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog'
import {
    BookOpen, Plus, Search, Calendar, DollarSign, Home, User,
    Clock, AlertTriangle, CheckCircle, RefreshCw, FileText,
    MoreHorizontal, Loader2, Filter, ArrowUpDown
} from 'lucide-react'
import { toast } from 'sonner'
import { format, differenceInDays, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600', icon: FileText },
    active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    expiring: { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
    expired: { label: 'Expired', color: 'bg-red-100 text-red-700', icon: Clock },
    terminated: { label: 'Terminated', color: 'bg-slate-200 text-slate-600', icon: Clock },
    renewed: { label: 'Renewed', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
}

export default function LeasesPage() {
    const supabase = createClient()
    const companyId = useCompanyId()
    const { colors } = useAccentColor()
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [dialogOpen, setDialogOpen] = useState(false)

    // Form state
    const [form, setForm] = useState({
        tenant_name: '', tenant_email: '', tenant_phone: '',
        property_id: '', start_date: '', end_date: '',
        rent_amount: '', deposit_amount: '', payment_day: '1',
        auto_renew: false, notes: '',
    })

    const { data: leases, isLoading } = useQuery({
        queryKey: ['leases', companyId.companyId],
        queryFn: async () => {
            if (!companyId.companyId) return []
            const { data, error } = await supabase
                .from('leases')
                .select('*, properties(address, unit_number)')
                .eq('company_id', companyId.companyId)
                .order('created_at', { ascending: false })
            if (error) throw error
            return data || []
        },
        enabled: !!companyId.companyId,
    })

    const { data: properties } = useQuery({
        queryKey: ['properties-select', companyId.companyId],
        queryFn: async () => {
            if (!companyId.companyId) return []
            const { data } = await supabase
                .from('properties')
                .select('id, address, unit_number')
                .eq('company_id', companyId.companyId)
                .order('address')
            return data || []
        },
        enabled: !!companyId.companyId,
    })

    const createLease = useMutation({
        mutationFn: async (leaseData: any) => {
            const { data, error } = await supabase
                .from('leases')
                .insert({
                    ...leaseData,
                    company_id: companyId.companyId,
                    rent_amount: parseFloat(leaseData.rent_amount),
                    deposit_amount: parseFloat(leaseData.deposit_amount || '0'),
                    payment_day: parseInt(leaseData.payment_day),
                    status: 'active',
                })
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leases'] })
            toast.success('Lease created successfully')
            setDialogOpen(false)
            setForm({
                tenant_name: '', tenant_email: '', tenant_phone: '',
                property_id: '', start_date: '', end_date: '',
                rent_amount: '', deposit_amount: '', payment_day: '1',
                auto_renew: false, notes: '',
            })
        },
        onError: (err: any) => toast.error(err.message),
    })

    const filteredLeases = (leases || []).filter((l: any) => {
        const matchSearch = l.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
            l.tenant_email?.toLowerCase().includes(search.toLowerCase()) ||
            l.properties?.address?.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || l.status === statusFilter
        return matchSearch && matchStatus
    })

    // Stats
    const activeLeases = leases?.filter((l: any) => l.status === 'active').length || 0
    const expiringLeases = leases?.filter((l: any) => l.status === 'expiring').length || 0
    const totalMonthlyRent = leases
        ?.filter((l: any) => ['active', 'expiring'].includes(l.status))
        .reduce((sum: number, l: any) => sum + (l.rent_amount || 0), 0) || 0

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <Loader2 className={cn("w-10 h-10 animate-spin", colors.text)} />
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1", colors.text)}>
                        <BookOpen className="h-3 w-3" />
                        <span>Lease Management</span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">Leases</h1>
                    <p className="text-slate-500 font-medium mt-1">Track all active and expiring leases.</p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className={cn("gap-2 font-bold rounded-xl shadow-lg", colors.bg)}>
                            <Plus className="w-4 h-4" /> New Lease
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black">Create New Lease</DialogTitle>
                            <DialogDescription>Add a new lease agreement to your portfolio.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); createLease.mutate(form) }} className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Property</label>
                                    <select
                                        className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                                        value={form.property_id}
                                        onChange={e => setForm({ ...form, property_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select property...</option>
                                        {properties?.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.address}{p.unit_number ? ` - ${p.unit_number}` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tenant Name</label>
                                    <Input className="mt-1" value={form.tenant_name} onChange={e => setForm({ ...form, tenant_name: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tenant Email</label>
                                    <Input className="mt-1" type="email" value={form.tenant_email} onChange={e => setForm({ ...form, tenant_email: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                                    <Input className="mt-1" value={form.tenant_phone} onChange={e => setForm({ ...form, tenant_phone: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Rent ($)</label>
                                    <Input className="mt-1" type="number" step="0.01" value={form.rent_amount} onChange={e => setForm({ ...form, rent_amount: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                                    <Input className="mt-1" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</label>
                                    <Input className="mt-1" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deposit ($)</label>
                                    <Input className="mt-1" type="number" step="0.01" value={form.deposit_amount} onChange={e => setForm({ ...form, deposit_amount: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Day</label>
                                    <Input className="mt-1" type="number" min="1" max="28" value={form.payment_day} onChange={e => setForm({ ...form, payment_day: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</label>
                                    <Textarea className="mt-1" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
                                </div>
                                <div className="col-span-2 flex items-center gap-2">
                                    <input type="checkbox" id="auto-renew" checked={form.auto_renew} onChange={e => setForm({ ...form, auto_renew: e.target.checked })} className="rounded" />
                                    <label htmlFor="auto-renew" className="text-sm font-medium text-slate-600">Auto-renew this lease</label>
                                </div>
                            </div>
                            <Button type="submit" className={cn("w-full font-bold", colors.bg)} disabled={createLease.isPending}>
                                {createLease.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Create Lease
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{activeLeases}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Leases</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{expiringLeases}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiring Soon</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">${totalMonthlyRent.toLocaleString()}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Rent</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search leases..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 rounded-xl"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {['all', 'active', 'expiring', 'expired', 'draft'].map(s => (
                        <Button
                            key={s}
                            variant={statusFilter === s ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter(s)}
                            className={cn("rounded-lg capitalize text-xs font-bold", statusFilter === s && colors.bg)}
                        >
                            {s === 'all' ? 'All' : s}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Leases List */}
            {filteredLeases.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <BookOpen className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-lg font-bold text-slate-400">No leases found</p>
                        <p className="text-sm text-slate-300 mt-1">Create your first lease to get started</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredLeases.map((lease: any) => {
                        const config = statusConfig[lease.status] || statusConfig.draft
                        const StatusIcon = config.icon
                        const daysLeft = differenceInDays(parseISO(lease.end_date), new Date())

                        return (
                            <Card key={lease.id} className="border-0 shadow-sm hover:shadow-md transition-all group">
                                <CardContent className="p-5">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", config.color)}>
                                                <StatusIcon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-bold text-slate-900 truncate">{lease.tenant_name}</p>
                                                    <Badge className={cn("text-[10px] font-black uppercase", config.color)}>{config.label}</Badge>
                                                </div>
                                                <p className="text-sm text-slate-400 truncate">
                                                    {lease.properties?.address}{lease.properties?.unit_number ? ` - ${lease.properties.unit_number}` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 text-sm flex-wrap">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Rent</p>
                                                <p className="font-black text-slate-900">${lease.rent_amount?.toLocaleString()}/mo</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Period</p>
                                                <p className="font-semibold text-slate-600">
                                                    {format(parseISO(lease.start_date), 'MMM d, yy')} — {format(parseISO(lease.end_date), 'MMM d, yy')}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Days Left</p>
                                                <p className={cn("font-black", daysLeft <= 30 ? 'text-red-500' : daysLeft <= 60 ? 'text-amber-500' : 'text-emerald-600')}>
                                                    {daysLeft > 0 ? daysLeft : 'Expired'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
