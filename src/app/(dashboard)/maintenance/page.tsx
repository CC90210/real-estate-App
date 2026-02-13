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
    Wrench, Plus, Search, AlertTriangle, Clock, CheckCircle,
    Zap, Loader2, Camera, ArrowUpDown, ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/hooks/useAuth'

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
    low: { label: 'Low', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
    medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    high: { label: 'High', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    emergency: { label: 'Emergency', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

const statusConfig: Record<string, { label: string; color: string }> = {
    open: { label: 'Open', color: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'In Progress', color: 'bg-indigo-100 text-indigo-700' },
    pending_parts: { label: 'Pending Parts', color: 'bg-amber-100 text-amber-700' },
    scheduled: { label: 'Scheduled', color: 'bg-purple-100 text-purple-700' },
    completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500' },
}

const categories = [
    'plumbing', 'electrical', 'hvac', 'appliance', 'structural',
    'pest', 'landscaping', 'security', 'general', 'emergency'
]

export default function MaintenancePage() {
    const supabase = createClient()
    const companyId = useCompanyId()
    const { colors } = useAccentColor()
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [detailOpen, setDetailOpen] = useState<string | null>(null)

    const [form, setForm] = useState({
        property_id: '', title: '', description: '', category: 'general', priority: 'medium',
    })

    const { data: requests, isLoading } = useQuery({
        queryKey: ['maintenance', companyId.companyId],
        queryFn: async () => {
            if (!companyId.companyId) return []
            const { data, error } = await supabase
                .from('maintenance_requests')
                .select('*, properties(address, unit_number), profiles:submitted_by(full_name, email), assigned:assigned_to(full_name)')
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

    const createRequest = useMutation({
        mutationFn: async (data: any) => {
            if (!companyId.companyId) {
                throw new Error('Not authenticated properly. Please refresh.')
            }
            const { error } = await supabase
                .from('maintenance_requests')
                .insert({
                    ...data,
                    company_id: companyId.companyId,
                    submitted_by: user?.id,
                })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance', companyId.companyId] })
            toast.success('Maintenance request submitted')
            setDialogOpen(false)
            setForm({ property_id: '', title: '', description: '', category: 'general', priority: 'medium' })
        },
        onError: (err: any) => toast.error(err.message),
    })

    const updateStatus = useMutation({
        mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
            const update: any = { status }
            if (status === 'completed') {
                update.resolved_at = new Date().toISOString()
                update.resolution_notes = notes
            }
            const { error } = await supabase.from('maintenance_requests').update(update).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance', companyId.companyId] })
            toast.success('Status updated')
            setDetailOpen(null)
        },
        onError: (err: any) => toast.error(err.message),
    })

    const filtered = (requests || []).filter((r: any) => {
        const matchSearch = r.title?.toLowerCase().includes(search.toLowerCase()) ||
            r.properties?.address?.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || r.status === statusFilter
        return matchSearch && matchStatus
    })

    const openCount = requests?.filter((r: any) => r.status === 'open').length || 0
    const inProgressCount = requests?.filter((r: any) => r.status === 'in_progress').length || 0
    const emergencyCount = requests?.filter((r: any) => r.priority === 'emergency' && r.status !== 'completed').length || 0

    // Instant-On: No full-page blocking loader. 
    // We show the layout and a subtle "Syncing" status if needed.
    const isSyncing = isLoading || companyId.isLoading;

    return (
        <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
            {/* Syncing Status Indicator (Subtle) */}
            {isSyncing && (
                <div className="fixed top-24 right-10 z-50 flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-slate-100 px-3 py-1.5 rounded-full shadow-sm">
                    <Loader2 className={cn("w-3 h-3 animate-spin", colors.text)} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing...</span>
                </div>
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1", colors.text)}>
                        <Wrench className="h-3 w-3" />
                        <span>Maintenance Hub</span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">Maintenance</h1>
                    <p className="text-slate-500 font-medium mt-1">Track and manage property maintenance requests.</p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className={cn("gap-2 font-bold rounded-xl shadow-lg", colors.bg)}>
                            <Plus className="w-4 h-4" /> New Request
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black">Submit Maintenance Request</DialogTitle>
                            <DialogDescription>Report an issue that needs attention.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); createRequest.mutate(form) }} className="space-y-4 mt-4">
                            <div>
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
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title</label>
                                <Input className="mt-1" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Leaking faucet in kitchen" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                                <Textarea className="mt-1" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required rows={4} placeholder="Describe the issue in detail..." />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                                    <select
                                        className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white capitalize"
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                                    <select
                                        className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white capitalize"
                                        value={form.priority}
                                        onChange={e => setForm({ ...form, priority: e.target.value })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="emergency">Emergency</option>
                                    </select>
                                </div>
                            </div>
                            <Button type="submit" className={cn("w-full font-bold", colors.bg)} disabled={createRequest.isPending}>
                                {createRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Submit Request
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{openCount}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-white">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                            <Wrench className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{inProgressCount}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Progress</p>
                        </div>
                    </CardContent>
                </Card>
                {emergencyCount > 0 && (
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-white border-red-200">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center animate-pulse">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-red-600">{emergencyCount}</p>
                                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Emergencies</p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search requests..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 rounded-xl"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {['all', 'open', 'in_progress', 'scheduled', 'completed'].map(s => (
                        <Button
                            key={s}
                            variant={statusFilter === s ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter(s)}
                            className={cn("rounded-lg text-xs font-bold", statusFilter === s && colors.bg)}
                        >
                            {s === 'all' ? 'All' : statusConfig[s]?.label || s}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Requests List */}
            {filtered.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Wrench className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-lg font-bold text-slate-400">No maintenance requests</p>
                        <p className="text-sm text-slate-300 mt-1">All clear — no issues reported</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map((req: any) => {
                        const priority = priorityConfig[req.priority] || priorityConfig.medium
                        const status = statusConfig[req.status] || statusConfig.open

                        return (
                            <Card key={req.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                                <CardContent className="p-5">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className={cn("w-3 h-3 rounded-full mt-1.5 flex-shrink-0", priority.dot)} />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-bold text-slate-900">{req.title}</p>
                                                    <Badge className={cn("text-[10px] font-black uppercase", status.color)}>{status.label}</Badge>
                                                    <Badge className={cn("text-[10px] uppercase", priority.color)}>{priority.label}</Badge>
                                                </div>
                                                <p className="text-sm text-slate-400 mt-0.5">
                                                    {req.properties?.address}{req.properties?.unit_number ? ` - ${req.properties.unit_number}` : ''} • {req.category}
                                                </p>
                                                <p className="text-xs text-slate-300 mt-1">
                                                    {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                                                    {req.profiles?.full_name && ` by ${req.profiles.full_name}`}
                                                </p>
                                            </div>
                                        </div>

                                        {req.status !== 'completed' && req.status !== 'cancelled' && (
                                            <div className="flex gap-2">
                                                {req.status === 'open' && (
                                                    <Button size="sm" variant="outline" className="text-xs font-bold"
                                                        onClick={() => updateStatus.mutate({ id: req.id, status: 'in_progress' })}>
                                                        Start Work
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="outline" className="text-xs font-bold text-emerald-600"
                                                    onClick={() => updateStatus.mutate({ id: req.id, status: 'completed', notes: 'Resolved' })}>
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Complete
                                                </Button>
                                            </div>
                                        )}
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
