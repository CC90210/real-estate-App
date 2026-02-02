'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
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
    Users
} from 'lucide-react'

interface Landlord {
    id: string
    name: string
    email: string
    phone?: string
    company_id: string
    properties_count?: number
    created_at: string
}

export default function LandlordsPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingLandlord, setEditingLandlord] = useState<Landlord | null>(null)
    const [formData, setFormData] = useState({ name: '', email: '', phone: '' })
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [landlordToDelete, setLandlordToDelete] = useState<Landlord | null>(null)

    // Fetch landlords
    const { data: landlords, isLoading, error } = useQuery({
        queryKey: ['landlords'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('landlords')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data || []
        }
    })

    // Create landlord
    const createLandlord = useMutation({
        mutationFn: async (data: { name: string; email: string; phone?: string }) => {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single()

            const { data: newLandlord, error } = await supabase
                .from('landlords')
                .insert({
                    ...data,
                    company_id: profile?.company_id
                })
                .select()
                .single()

            if (error) throw error
            return newLandlord
        },
        onSuccess: () => {
            toast.success('Landlord created successfully!')
            queryClient.invalidateQueries({ queryKey: ['landlords'] })
            closeDialog()
        },
        onError: (error: any) => {
            toast.error('Failed to create landlord', { description: error.message })
        }
    })

    // Update landlord
    const updateLandlord = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Landlord> }) => {
            const { data: updated, error } = await supabase
                .from('landlords')
                .update(data)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return updated
        },
        onSuccess: () => {
            toast.success('Landlord updated!')
            queryClient.invalidateQueries({ queryKey: ['landlords'] })
            closeDialog()
        },
        onError: (error: any) => {
            toast.error('Failed to update landlord', { description: error.message })
        }
    })

    // Delete landlord
    const deleteLandlord = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('landlords')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            toast.success('Landlord deleted')
            queryClient.invalidateQueries({ queryKey: ['landlords'] })
            setDeleteDialogOpen(false)
            setLandlordToDelete(null)
        },
        onError: (error: any) => {
            toast.error('Failed to delete landlord', { description: error.message })
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (editingLandlord) {
            updateLandlord.mutate({ id: editingLandlord.id, data: formData })
        } else {
            createLandlord.mutate(formData)
        }
    }

    const confirmDelete = (landlord: Landlord) => {
        setLandlordToDelete(landlord)
        setDeleteDialogOpen(true)
    }

    // Filter landlords
    const filteredLandlords = landlords?.filter(l => {
        if (!searchTerm) return true
        const search = searchTerm.toLowerCase()
        return (
            l.name?.toLowerCase().includes(search) ||
            l.email?.toLowerCase().includes(search)
        )
    })

    // Loading
    if (isLoading) {
        return (
            <div className="p-4 md:p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-10 w-36" />
                </div>
                <Skeleton className="h-10 w-full max-w-md" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Skeleton key={i} className="h-40" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">Landlords</h1>
                    <p className="text-gray-500 text-sm md:text-base">
                        Manage property owners and their portfolios
                    </p>
                </div>
                <Button onClick={openCreateDialog} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Landlord
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search landlords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Landlords Grid */}
            {!filteredLandlords || filteredLandlords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
                    <Users className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium mb-1">No landlords yet</h3>
                    <p className="text-gray-500 mb-4 text-center">
                        {searchTerm ? 'No landlords match your search' : 'Add your first landlord to get started'}
                    </p>
                    {!searchTerm && (
                        <Button onClick={openCreateDialog}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Landlord
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLandlords.map(landlord => (
                        <Card key={landlord.id} className="overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <User className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-medium truncate">{landlord.name}</h3>
                                            <p className="text-sm text-gray-500 truncate">{landlord.email}</p>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openEditDialog(landlord)}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => confirmDelete(landlord)}
                                                className="text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {landlord.phone && (
                                    <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
                                        <Phone className="h-4 w-4" />
                                        {landlord.phone}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingLandlord ? 'Edit Landlord' : 'Add Landlord'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingLandlord
                                ? 'Update landlord information'
                                : 'Add a new property owner to your system'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Smith"
                                />
                            </div>
                            <div>
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div>
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="(416) 555-1234"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeDialog}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createLandlord.isPending || updateLandlord.isPending}
                            >
                                {editingLandlord ? 'Save Changes' : 'Add Landlord'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Landlord</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {landlordToDelete?.name}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => landlordToDelete && deleteLandlord.mutate(landlordToDelete.id)}
                            disabled={deleteLandlord.isPending}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
