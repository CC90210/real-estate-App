'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PhotoUpload } from '@/components/common/PhotoUpload'
import {
    Wrench,
    Plus,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ClipboardList,
    Clock,
    Camera,
    X,
    MessageSquare,
    Image as ImageIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function TenantMaintenancePage() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const supabase = createClient()
    const queryClient = useQueryClient()

    // Form State
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('general')
    const [priority, setPriority] = useState('medium')
    const [photos, setPhotos] = useState<string[]>([])

    // 1. Fetch Tenant's Lease to get property_id and company_id
    const { data: lease } = useQuery({
        queryKey: ['tenant-lease-context'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null
            const { data } = await supabase
                .from('leases')
                .select('property_id, company_id')
                .eq('tenant_id', user.id)
                .eq('status', 'active')
                .maybeSingle()
            return data
        }
    })

    // 2. Fetch Maintenance Requests
    const { data: requests, isLoading } = useQuery({
        queryKey: ['tenant-maintenance-history'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            const { data, error } = await supabase
                .from('maintenance_requests')
                .select('*')
                .eq('submitted_by', user?.id)
                .order('created_at', { ascending: false })
            if (error) throw error
            return data
        }
    })

    const submitRequest = async () => {
        if (!title || !description || !lease) {
            toast.error('Please fill in all required fields')
            return
        }

        setIsSubmitting(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            const res = await fetch('/api/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    category,
                    priority,
                    photos,
                    property_id: lease.property_id,
                    company_id: lease.company_id,
                    submitted_by: user?.id
                })
            })

            if (!res.ok) throw new Error('Failed to submit request')

            toast.success('Maintenance request submitted successfully')
            setShowForm(false)
            // Reset form
            setTitle('')
            setDescription('')
            setPhotos([])
            queryClient.invalidateQueries({ queryKey: ['tenant-maintenance-history'] })
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                        <Wrench className="w-10 h-10 text-slate-900" /> Maintenance
                    </h1>
                    <p className="text-lg font-medium text-slate-500 mt-2">Submit repair requests and track progress.</p>
                </div>
                {!showForm && (
                    <Button
                        onClick={() => setShowForm(true)}
                        className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white px-8 h-14 text-lg font-black shadow-xl shadow-indigo-600/20"
                    >
                        <Plus className="w-6 h-6 mr-2" /> New Request
                    </Button>
                )}
            </div>

            {showForm && (
                <Card className="border-0 shadow-2xl shadow-indigo-500/10 rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-300">
                    <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-2xl font-black text-slate-900">Request Repair</CardTitle>
                                <CardDescription className="text-slate-500 font-medium">Be as descriptive as possible to help our team.</CardDescription>
                            </div>
                            <Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-full h-10 w-10 p-0 hover:bg-white">
                                <X className="w-5 h-5 text-slate-400" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">What's the issue?</Label>
                                    <Input
                                        placeholder="Leaking faucet in kitchen"
                                        className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all text-lg font-bold"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Category</Label>
                                        <Select value={category} onValueChange={setCategory}>
                                            <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50/50">
                                                <SelectValue placeholder="Select..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-slate-100">
                                                <SelectItem value="plumbing">Plumbing</SelectItem>
                                                <SelectItem value="electrical">Electrical</SelectItem>
                                                <SelectItem value="hvac">HVAC / Air</SelectItem>
                                                <SelectItem value="appliance">Appliance</SelectItem>
                                                <SelectItem value="general">General</SelectItem>
                                                <SelectItem value="emergency">Emergency</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Priority</Label>
                                        <Select value={priority} onValueChange={setPriority}>
                                            <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50/50">
                                                <SelectValue placeholder="Select..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-slate-100">
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="emergency">Emergency</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Additional Details</Label>
                                    <Textarea
                                        placeholder="Explain exactly where and what happened..."
                                        className="min-h-[160px] rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all p-4 text-base font-medium"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <Camera className="w-4 h-4" /> Photos
                                    </Label>
                                    <PhotoUpload
                                        value={photos}
                                        onChange={setPhotos}
                                        maxPhotos={5}
                                        folder="maintenance"
                                    />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maximum 5 photos. Required for faster assessment.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-50">
                            <Button
                                onClick={submitRequest}
                                disabled={isSubmitting}
                                className="h-14 px-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-xl shadow-slate-900/10"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Request"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* History List */}
            <div className="space-y-6">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <ClipboardList className="w-6 h-6 text-slate-400" /> Request History
                </h3>

                {requests && requests.length > 0 ? (
                    <div className="space-y-4">
                        {requests.map((req) => (
                            <Card key={req.id} className="border-0 shadow-lg shadow-slate-200/40 bg-white rounded-3xl overflow-hidden group hover:scale-[1.01] transition-all">
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row">
                                        {/* Status Sidebar */}
                                        <div className={cn(
                                            "w-2 md:w-3",
                                            req.status === 'completed' ? "bg-emerald-500" :
                                                req.status === 'cancelled' ? "bg-slate-300" :
                                                    req.status === 'open' ? "bg-blue-500" : "bg-amber-500"
                                        )} />

                                        <div className="flex-1 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="flex items-start gap-5">
                                                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                                                    {req.photos?.[0] ? (
                                                        <img src={req.photos[0]} alt="" className="w-full h-full object-cover rounded-2xl" />
                                                    ) : (
                                                        <ImageIcon className="w-6 h-6 text-slate-200" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h4 className="text-xl font-black text-slate-900">{req.title}</h4>
                                                        <Badge variant="outline" className="rounded-full font-bold text-[10px] uppercase tracking-widest border-slate-200">
                                                            {req.category}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-500 line-clamp-1">{req.description}</p>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <p className="text-xs font-bold text-slate-400 flex items-center">
                                                            <Clock className="w-3 h-3 mr-1" /> {format(new Date(req.created_at), 'MMMM d, yyyy')}
                                                        </p>
                                                        {req.priority === 'emergency' && (
                                                            <p className="text-xs font-black text-red-500 flex items-center uppercase tracking-widest">
                                                                <AlertCircle className="w-3 h-3 mr-1" /> Emergency
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 pt-4 md:pt-0">
                                                <Badge className={cn(
                                                    "capitalize font-black text-xs px-4 py-1.5 rounded-full border-0",
                                                    req.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
                                                        req.status === 'open' ? "bg-blue-50 text-blue-600" :
                                                            req.status === 'cancelled' ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-600"
                                                )}>
                                                    {req.status.replace('_', ' ')}
                                                </Badge>
                                                {req.status === 'scheduled' && req.scheduled_date && (
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                                        Appt: {format(new Date(req.scheduled_date), 'MMM d @ h:mm a')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-20 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
                        <div className="p-6 bg-white rounded-[2rem] shadow-sm mb-6">
                            <Wrench className="w-12 h-12 text-slate-200" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">No maintenance history</h3>
                        <p className="text-slate-500 font-medium max-w-sm text-center">
                            When you submit a repair request, it will appear here so you can track its progress.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
