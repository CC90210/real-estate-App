'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCompanyId } from '@/lib/hooks/useCompanyId'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Plus,
    User,
    Mail,
    Phone,
    Building2,
    MoreVertical,
    Pencil,
    Trash2,
    Search,
    Users,
    Fingerprint,
    Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccentColor } from '@/lib/hooks/useAccentColor'

interface Landlord {
    id: string
    name: string
    email: string
    phone?: string
    company_id: string
    created_at: string
}

export default function LandlordsPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const { companyId, isLoading: isCompanyLoading } = useCompanyId()
    const { colors } = useAccentColor()
    const [searchTerm, setSearchTerm] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingLandlord, setEditingLandlord] = useState<Landlord | null>(null)
    const [formData, setFormData] = useState({ name: '', email: '', phone: '' })
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [landlordToDelete, setLandlordToDelete] = useState<Landlord | null>(null)

    const { data: landlords, isLoading, error } = useQuery({
        queryKey: ['landlords', companyId],
        queryFn: async () => {
            if (!companyId) return []
            const { data, error } = await supabase
                .from('landlords')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data || []
        },
        enabled: !!companyId,
    })

    const createLandlord = useMutation({
        mutationFn: async (data: { name: string; email: string; phone?: string }) => {
            const { data: newLandlord, error } = await supabase
                .from('landlords')
                .insert({
                    ...data,
                    company_id: companyId
                })
                .select()
                .single()

            if (error) throw error
            return newLandlord
        },
        onSuccess: () => {
            toast.success('Authorized personnel added')
            queryClient.invalidateQueries({ queryKey: ['landlords'] })
            closeDialog()
        },
        onError: (error: any) => {
            toast.error('Failed to add personnel', { description: error.message })
        }
    })

    const updateLandlord = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Landlord> }) => {
            const { data: updated, error } = await supabase
                .from('landlords')
                .update(data)
                .eq('id', id)
                .eq('company_id', companyId)
                .select()
                .single()

            if (error) throw error
            return updated
        },
        onSuccess: () => {
            toast.success('Personnel updated')
            queryClient.invalidateQueries({ queryKey: ['landlords'] })
            closeDialog()
        },
        onError: (error: any) => {
            toast.error('Update failed', { description: error.message })
        }
    })

    const deleteLandlord = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('landlords')
                .delete()
                .eq('id', id)
                .eq('company_id', companyId)

            if (error) throw error
        },
        onSuccess: () => {
            toast.success('Personnel removed from synchronization')
            queryClient.invalidateQueries({ queryKey: ['landlords'] })
            setDeleteDialogOpen(false)
            setLandlordToDelete(null)
        },
        onError: (error: any) => {
            toast.error('Removal failed', { description: error.message })
        }
    })

    const openCreateDialog = () => {
        setEditingLandlord(null)
        setFormData({ name: '', email: '', phone: '' })
        setDialogOpen(true)
    }

    const openEditDialog = (landlord: Landlord) => {
        setEditingLandlord(landlord)
        setFormData({
            name: landlord.name || '',
            email: landlord.email || '',
            phone: landlord.phone || ''
        })
        setDialogOpen(true)
    }

    const closeDialog = () => {
        setDialogOpen(false)
        setEditingLandlord(null)
        setFormData({ name: '', email: '', phone: '' })
    }

    const confirmDelete = (landlord: Landlord) => {
        setLandlordToDelete(landlord)
        setDeleteDialogOpen(true)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (editingLandlord) {
            updateLandlord.mutate({ id: editingLandlord.id, data: formData })
        } else {
            createLandlord.mutate(formData)
        }
    }

    const filteredLandlords = landlords?.filter(l => {
        if (!searchTerm) return true
        const search = searchTerm.toLowerCase()
        return l.name?.toLowerCase().includes(search) || l.email?.toLowerCase().includes(search)
    })

    if (isLoading || isCompanyLoading) {
        return (
            <div className="p-10 space-y-10">
                <Skeleton className="h-10 w-48 rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-48 w-full rounded-[2rem]" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="relative p-6 lg:p-10 space-y-10">
            {/* Decoration */}
            <div className={cn("absolute top-0 right-0 w-[30rem] h-[30rem] rounded-full blur-[100px] -z-10 animate-pulse", colors.bgLight)} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1", colors.text)}>
                        <Users className="h-3 w-3" />
                        <span>Personnel Management</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Landlords</h1>
                    <p className="text-slate-500 font-medium">
                        Strategic oversight of property owners and asset stakeholders ({filteredLandlords?.length || 0} active)
                    </p>
                </div>
                <Button onClick={openCreateDialog} className={cn("h-14 px-8 text-white rounded-2xl shadow-xl gap-2 font-bold transition-all hover:scale-105", colors.bg, `hover:${colors.bgHover}`, colors.shadow)}>
                    <Plus className="h-4 w-4" />
                    Secure Entry
                </Button>
            </div>

            <Card className="bg-white/80 backdrop-blur-xl border-slate-100 rounded-[2rem] shadow-xl shadow-slate-200/50 p-6 max-w-lg">
                <div className="relative group">
                    <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors", `group-focus-within:${colors.text}`)} />
                    <Input
                        placeholder="Identify personnel..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={cn("h-12 pl-12 bg-slate-50 border-transparent focus:bg-white transition-all rounded-xl font-medium", colors.focusRing, `focus:${colors.border.replace('border-', 'border-')}`)}
                    />
                </div>
            </Card>

            {!filteredLandlords || filteredLandlords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-slate-100">
                    <Fingerprint className="h-16 w-16 text-slate-100 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 mb-1">No verified personnel</h3>
                    <p className="text-slate-500 font-medium mb-8">
                        {searchTerm ? 'No coordination match found' : 'Registry is currently empty'}
                    </p>
                    {!searchTerm && (
                        <Button onClick={openCreateDialog} variant="outline" className={cn("rounded-xl border-slate-200 font-bold", colors.text, `hover:${colors.bgLight}`)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Register First Owner
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredLandlords.map((landlord, idx) => (
                            <motion.div
                                key={landlord.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: idx * 0.05 }}
                            >
                                <Card className={cn("group relative bg-white rounded-[2rem] border-slate-100/60 shadow-lg shadow-slate-200/40 transition-all duration-500 overflow-hidden", colors.shadowHover)}>
                                    <CardContent className="p-8">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center transition-colors", `group-hover:${colors.bgLight}`)}>
                                                    <User className={cn("h-7 w-7 text-slate-300 transition-colors", `group-hover:${colors.text}`)} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className={cn("text-lg font-black text-slate-900 transition-colors truncate tracking-tight", `group-hover:${colors.text}`)}>{landlord.name}</h3>
                                                    <div className="flex items-center text-xs font-bold text-slate-400 truncate mt-1">
                                                        <Mail className={cn("h-3 w-3 mr-2", colors.text)} />
                                                        {landlord.email}
                                                    </div>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10">
                                                        <MoreVertical className="h-4 w-4 text-slate-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl">
                                                    <DropdownMenuItem onClick={() => openEditDialog(landlord)} className="p-3 font-bold rounded-lg cursor-pointer">
                                                        <Pencil className="h-4 w-4 mr-3 text-indigo-500" />
                                                        Modify
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => confirmDelete(landlord)}
                                                        className="p-3 font-bold rounded-lg cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-3" />
                                                        Terminate
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                            {landlord.phone ? (
                                                <div className="flex items-center gap-2 text-xs font-black text-slate-500">
                                                    <Phone className={cn("h-3 w-3", colors.text)} />
                                                    {landlord.phone}
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No contact uplink</div>
                                            )}
                                            <div className={cn("flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors", `group-hover:${colors.bgLight}`, `group-hover:${colors.text}`, "text-slate-400")}>
                                                <Shield className="h-3 w-3" />
                                                Verified
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none bg-white shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900">
                            {editingLandlord ? 'Modify Personnel' : 'Personnel Entry'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            {editingLandlord ? 'Update stakeholder synchronization data.' : 'Establish a new verified property stakeholder.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Legal Name</Label>
                                <Input
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className={cn("h-12 bg-slate-50 border-transparent focus:bg-white transition-all rounded-xl font-bold", colors.focusRing, `focus:${colors.border}`)}
                                    placeholder="John Matrix"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Secure Email</Label>
                                <Input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className={cn("h-12 bg-slate-50 border-transparent focus:bg-white transition-all rounded-xl font-bold", colors.focusRing, `focus:${colors.border}`)}
                                    placeholder="john@nexus.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Primary Phone</Label>
                                <Input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className={cn("h-12 bg-slate-50 border-transparent focus:bg-white transition-all rounded-xl font-bold", colors.focusRing, `focus:${colors.border}`)}
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                        </div>
                        <DialogFooter className="pt-4 flex gap-3">
                            <Button type="button" variant="ghost" onClick={closeDialog} className="rounded-xl font-bold">
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createLandlord.isPending || updateLandlord.isPending}
                                className={cn("text-white rounded-xl px-8 font-black shadow-lg", colors.bg, `hover:${colors.bgHover}`, colors.shadow)}
                            >
                                {editingLandlord ? 'Execute Update' : 'Finalize Registry'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-sm rounded-[2.5rem] p-8 border-none bg-white shadow-2xl text-center">
                    <div className="h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Trash2 className="h-8 w-8 text-rose-500" />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 text-center">Terminate Record?</DialogTitle>
                        <DialogDescription className="text-center font-medium">
                            Personnel <span className="text-slate-900 font-bold">{landlordToDelete?.name}</span> will be permanently removed from synchronization.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-8 flex justify-center !gap-4">
                        <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl font-bold">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => landlordToDelete && deleteLandlord.mutate(landlordToDelete.id)}
                            disabled={deleteLandlord.isPending}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-8 font-black"
                        >
                            Confirm Termination
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
