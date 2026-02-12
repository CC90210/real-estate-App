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
    Contact, Plus, Search, Mail, Phone, Tag, Building2,
    Loader2, User, MoreHorizontal, Download, Upload
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/lib/hooks/useAuth'

const typeConfig: Record<string, { label: string; color: string }> = {
    prospect: { label: 'Prospect', color: 'bg-blue-100 text-blue-700' },
    tenant: { label: 'Tenant', color: 'bg-emerald-100 text-emerald-700' },
    vendor: { label: 'Vendor', color: 'bg-purple-100 text-purple-700' },
    landlord: { label: 'Landlord', color: 'bg-amber-100 text-amber-700' },
    other: { label: 'Other', color: 'bg-slate-100 text-slate-600' },
}

export default function ContactsPage() {
    const supabase = createClient()
    const companyId = useCompanyId()
    const { colors } = useAccentColor()
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [dialogOpen, setDialogOpen] = useState(false)

    const [form, setForm] = useState({
        name: '', email: '', phone: '', type: 'prospect',
        company_name: '', address: '', notes: '', tags: '',
    })

    const { data: contacts, isLoading } = useQuery({
        queryKey: ['contacts', companyId],
        queryFn: async () => {
            if (!companyId) return []
            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })
            if (error) throw error
            return data || []
        },
        enabled: !!companyId,
    })

    const createContact = useMutation({
        mutationFn: async (contactData: any) => {
            const tags = contactData.tags
                ? contactData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                : []
            const { error } = await supabase
                .from('contacts')
                .insert({
                    name: contactData.name,
                    email: contactData.email || null,
                    phone: contactData.phone || null,
                    type: contactData.type,
                    company_name: contactData.company_name || null,
                    address: contactData.address || null,
                    notes: contactData.notes || null,
                    tags,
                    company_id: companyId,
                    created_by: user?.id,
                })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] })
            toast.success('Contact added')
            setDialogOpen(false)
            setForm({ name: '', email: '', phone: '', type: 'prospect', company_name: '', address: '', notes: '', tags: '' })
        },
        onError: (err: any) => toast.error(err.message),
    })

    const deleteContact = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('contacts').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] })
            toast.success('Contact deleted')
        },
    })

    const handleExport = () => {
        if (!contacts?.length) return toast.error('No contacts to export')
        const headers = ['Name', 'Email', 'Phone', 'Type', 'Company', 'Address', 'Tags', 'Notes']
        const rows = contacts.map((c: any) => [
            c.name, c.email || '', c.phone || '', c.type,
            c.company_name || '', c.address || '',
            (c.tags || []).join('; '), c.notes || ''
        ])
        const csv = [headers.join(','), ...rows.map(r => r.map((v: string) => `"${v}"`).join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Contacts exported')
    }

    const filtered = (contacts || []).filter((c: any) => {
        const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.email?.toLowerCase().includes(search.toLowerCase()) ||
            c.phone?.includes(search) ||
            c.company_name?.toLowerCase().includes(search.toLowerCase())
        const matchType = typeFilter === 'all' || c.type === typeFilter
        return matchSearch && matchType
    })

    const typeCounts = {
        prospect: contacts?.filter((c: any) => c.type === 'prospect').length || 0,
        tenant: contacts?.filter((c: any) => c.type === 'tenant').length || 0,
        vendor: contacts?.filter((c: any) => c.type === 'vendor').length || 0,
        landlord: contacts?.filter((c: any) => c.type === 'landlord').length || 0,
    }

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
                        <Contact className="h-3 w-3" />
                        <span>CRM</span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">Contacts</h1>
                    <p className="text-slate-500 font-medium mt-1">Manage your prospects, tenants, and vendors.</p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 font-semibold rounded-xl" onClick={handleExport}>
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className={cn("gap-2 font-bold rounded-xl shadow-lg", colors.bg)}>
                                <Plus className="w-4 h-4" /> Add Contact
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black">Add Contact</DialogTitle>
                                <DialogDescription>Add a new contact to your CRM.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={(e) => { e.preventDefault(); createContact.mutate(form) }} className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name *</label>
                                        <Input className="mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                                        <Input className="mt-1" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                                        <Input className="mt-1" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
                                        <select
                                            className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                                            value={form.type}
                                            onChange={e => setForm({ ...form, type: e.target.value })}
                                        >
                                            {Object.entries(typeConfig).map(([k, v]) => (
                                                <option key={k} value={k}>{v.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company</label>
                                        <Input className="mt-1" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</label>
                                        <Input className="mt-1" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tags (comma separated)</label>
                                        <Input className="mt-1" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="e.g. VIP, preferred, local" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</label>
                                        <Textarea className="mt-1" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
                                    </div>
                                </div>
                                <Button type="submit" className={cn("w-full font-bold", colors.bg)} disabled={createContact.isPending}>
                                    {createContact.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Add Contact
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Type Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(typeCounts).map(([type, count]) => {
                    const config = typeConfig[type]
                    return (
                        <button
                            key={type}
                            onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                            className={cn(
                                "p-4 rounded-2xl border transition-all text-left",
                                typeFilter === type ? "border-slate-300 shadow-sm bg-white" : "border-transparent bg-slate-50 hover:bg-white"
                            )}
                        >
                            <p className="text-2xl font-black text-slate-900">{count}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{config.label}s</p>
                        </button>
                    )
                })}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="Search contacts..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 rounded-xl"
                />
            </div>

            {/* Contacts List */}
            {filtered.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Contact className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-lg font-bold text-slate-400">No contacts found</p>
                        <p className="text-sm text-slate-300 mt-1">Add your first contact to begin</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((contact: any) => {
                        const config = typeConfig[contact.type] || typeConfig.other
                        return (
                            <Card key={contact.id} className="border-0 shadow-sm hover:shadow-md transition-all group">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center font-bold text-slate-500 text-sm">
                                                {contact.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{contact.name}</p>
                                                <Badge className={cn("text-[10px] font-black uppercase mt-0.5", config.color)}>{config.label}</Badge>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => {
                                                if (confirm('Delete this contact?')) deleteContact.mutate(contact.id)
                                            }}
                                        >×</Button>
                                    </div>

                                    <div className="space-y-1.5 text-sm">
                                        {contact.email && (
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Mail className="w-3.5 h-3.5 text-slate-300" />
                                                <span className="truncate">{contact.email}</span>
                                            </div>
                                        )}
                                        {contact.phone && (
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Phone className="w-3.5 h-3.5 text-slate-300" />
                                                <span>{contact.phone}</span>
                                            </div>
                                        )}
                                        {contact.company_name && (
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Building2 className="w-3.5 h-3.5 text-slate-300" />
                                                <span>{contact.company_name}</span>
                                            </div>
                                        )}
                                    </div>

                                    {contact.tags?.length > 0 && (
                                        <div className="flex gap-1 flex-wrap mt-3">
                                            {contact.tags.map((tag: string) => (
                                                <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-[10px] text-slate-300 mt-3">
                                        Added {formatDistanceToNow(new Date(contact.created_at), { addSuffix: true })}
                                    </p>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
