'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Users, X, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface LandlordAssignmentProps {
    propertyId: string
}

export function LandlordAssignment({ propertyId }: LandlordAssignmentProps) {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const [selectedLandlord, setSelectedLandlord] = useState<string>('')

    // Fetch landlords in the company
    const { data: landlords, isLoading: loadingLandlords } = useQuery({
        queryKey: ['landlords-list'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('role', 'landlord')

            if (error) throw error
            return data || []
        },
    })

    // Fetch assigned landlords for this property
    const { data: assignments, isLoading: loadingAssignments } = useQuery({
        queryKey: ['property-landlords', propertyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('landlord_properties')
                .select(`
                    id,
                    landlord:profiles(id, full_name, email)
                `)
                .eq('property_id', propertyId)

            if (error) throw error
            return data as any[] || []
        },
    })

    // Assign landlord mutation
    const assignMutation = useMutation({
        mutationFn: async (landlordId: string) => {
            const { error } = await supabase
                .from('landlord_properties')
                .insert({ landlord_id: landlordId, property_id: propertyId })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['property-landlords', propertyId] })
            setSelectedLandlord('')
            toast.success('Landlord assigned successfully')
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to assign landlord')
        },
    })

    // Remove assignment mutation
    const removeMutation = useMutation({
        mutationFn: async (assignmentId: string) => {
            const { error } = await supabase
                .from('landlord_properties')
                .delete()
                .eq('id', assignmentId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['property-landlords', propertyId] })
            toast.success('Landlord assignment removed')
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to remove landlord')
        },
    })

    const assignedIds = assignments?.map(a => a.landlord?.id) || []
    const availableLandlords = landlords?.filter(l => !assignedIds.includes(l.id)) || []

    return (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Property Landlords</h3>
                        <p className="text-xs text-slate-500 font-medium">Assign landlords to manage this property</p>
                    </div>
                </div>
                <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    {assignments?.length || 0} Assigned
                </Badge>
            </div>

            {/* Current assignments */}
            <div className="space-y-3 mb-6">
                {(loadingAssignments || loadingLandlords) ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                    </div>
                ) : assignments?.length === 0 ? (
                    <div className="text-center py-8 px-4 border-2 border-dashed border-slate-100 rounded-2xl">
                        <p className="text-sm text-slate-400 font-medium">No landlords assigned to this property yet.</p>
                    </div>
                ) : (
                    assignments?.map((assignment) => (
                        <div
                            key={assignment.id}
                            className="flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 border border-slate-100/50 rounded-xl px-4 py-3 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400">
                                    {assignment.landlord?.full_name?.charAt(0) || 'L'}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-900">{assignment.landlord?.full_name}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">{assignment.landlord?.email}</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                onClick={() => removeMutation.mutate(assignment.id)}
                                disabled={removeMutation.isPending}
                            >
                                {removeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            </Button>
                        </div>
                    ))
                )}
            </div>

            {/* Add new assignment */}
            {!loadingLandlords && availableLandlords.length > 0 && (
                <div className="flex gap-2">
                    <Select value={selectedLandlord} onValueChange={setSelectedLandlord}>
                        <SelectTrigger className="flex-1 bg-slate-50 border-slate-200 rounded-xl focus:ring-blue-500/10">
                            <SelectValue placeholder="Select a landlord..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                            {availableLandlords.map((landlord) => (
                                <SelectItem key={landlord.id} value={landlord.id} className="rounded-lg m-1">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm">{landlord.full_name}</span>
                                        <span className="text-[10px] font-medium text-slate-400">{landlord.email}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        onClick={() => selectedLandlord && assignMutation.mutate(selectedLandlord)}
                        disabled={!selectedLandlord || assignMutation.isPending}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/10"
                    >
                        {assignMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Plus className="h-4 w-4 mr-2" />
                                <span>Assign</span>
                            </>
                        )}
                    </Button>
                </div>
            )}

            {!loadingLandlords && availableLandlords.length === 0 && assignments?.length !== 0 && (
                <p className="text-[10px] text-center text-slate-400 font-medium italic">
                    All available landlords have been assigned.
                </p>
            )}
        </div>
    )
}
