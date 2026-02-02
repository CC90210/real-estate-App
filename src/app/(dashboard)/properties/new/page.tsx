'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Building2, MapPin, Home, Loader2, Plus, CheckCircle2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function NewPropertyPage() {
    const router = useRouter()
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Data
    const [areas, setAreas] = useState<any[]>([])
    const [buildings, setBuildings] = useState<any[]>([])

    // Selection State
    const [selectedAreaId, setSelectedAreaId] = useState<string>('new')
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>('new') // 'new' or UUID

    // Form State - New Area/Building
    const [newAreaName, setNewAreaName] = useState('')
    const [newBuildingName, setNewBuildingName] = useState('')
    const [newBuildingAddress, setNewBuildingAddress] = useState('')

    // Form State - Property
    const [unitNumber, setUnitNumber] = useState('')
    const [bedrooms, setBedrooms] = useState('')
    const [bathrooms, setBathrooms] = useState('')
    const [rent, setRent] = useState('')
    const [sqft, setSqft] = useState('')

    // Fetch Areas
    useEffect(() => {
        const fetchAreas = async () => {
            setIsLoading(true)
            const { data } = await supabase.from('areas').select('*').order('name')
            if (data) setAreas(data)
            setIsLoading(false)
        }
        fetchAreas()
    }, [])

    // Fetch Buildings when Area changes
    useEffect(() => {
        if (selectedAreaId && selectedAreaId !== 'new') {
            const fetchBuildings = async () => {
                const { data } = await supabase
                    .from('buildings')
                    .select('*')
                    .eq('area_id', selectedAreaId)
                    .order('name')

                if (data) {
                    setBuildings(data)
                    // Reset building selection if previous selection is not in new list
                    if (!data.find(b => b.id === selectedBuildingId) && selectedBuildingId !== 'new') {
                        setSelectedBuildingId('new')
                    }
                }
            }
            fetchBuildings()
        } else {
            setBuildings([])
            setSelectedBuildingId('new')
        }
    }, [selectedAreaId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            // Get user and company context first
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Authentication required")

            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single()

            if (!profile?.company_id) throw new Error("Company profile not found")

            // Proceed with provisioning using company_id
            let finalAreaId = selectedAreaId
            let finalBuildingId = selectedBuildingId

            // 1. Create Area if needed
            if (selectedAreaId === 'new') {
                if (!newAreaName) throw new Error("Area name is required")
                const { data: area, error } = await supabase
                    .from('areas')
                    .insert({
                        name: newAreaName,
                        company_id: profile.company_id
                    })
                    .select()
                    .single()
                if (error) throw error
                finalAreaId = area.id
            }

            // 2. Create Building if needed
            if (selectedBuildingId === 'new') {
                if (!newBuildingName || !newBuildingAddress) throw new Error("Building details are required")
                const { data: building, error } = await supabase
                    .from('buildings')
                    .insert({
                        area_id: finalAreaId,
                        name: newBuildingName,
                        address: newBuildingAddress,
                        company_id: profile.company_id
                    })
                    .select()
                    .single()
                if (error) throw error
                finalBuildingId = building.id
            }

            // 3. Create Property
            // 3. Create Property
            // Derive address from building
            let finalBuildingAddress = newBuildingAddress
            if (selectedBuildingId !== 'new') {
                const selectedBuilding = buildings.find(b => b.id === selectedBuildingId)
                if (selectedBuilding) {
                    finalBuildingAddress = selectedBuilding.address
                }
            }

            const { error: propError } = await supabase
                .from('properties')
                .insert({
                    building_id: finalBuildingId,
                    company_id: profile.company_id,
                    address: finalBuildingAddress, // Denormalized address field required by DB
                    unit_number: unitNumber || 'Main',
                    bedrooms: parseInt(bedrooms) || 0,
                    bathrooms: parseFloat(bathrooms) || 1,
                    rent: parseFloat(rent) || 0,
                    square_feet: parseInt(sqft) || 0,
                    status: 'available'
                })

            if (propError) throw propError

            toast.success("Property provisioned successfully!")

            // Log activity
            await supabase.from('activity_log').insert({
                company_id: profile.company_id,
                user_id: user.id,
                action: 'created',
                entity_type: 'properties',
                details: { address: newBuildingAddress || 'New Property' }
            })

            router.push('/properties')
            router.refresh()

        } catch (error: any) {
            console.error(error)
            toast.error("Failed to create property", { description: error.message })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto pb-20 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.back()} className="rounded-xl font-bold text-slate-500">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Portfolio
                </Button>
            </div>

            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none" />
                    <CardTitle className="text-3xl font-black flex items-center gap-3 relative z-10">
                        <Home className="w-8 h-8 text-blue-400" />
                        Provision New Asset
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-10">
                    <form onSubmit={handleSubmit} className="space-y-10">

                        {/* Step 1: Location Context */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-black text-slate-900 border-b pb-2 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-indigo-500" /> Location Context
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Area Selection */}
                                <div className="space-y-4">
                                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Area / Neighborhood</Label>
                                    <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                                        <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold">
                                            <SelectValue placeholder="Select Area" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new" className="text-blue-600 font-bold">+ Create New Area</SelectItem>
                                            {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {selectedAreaId === 'new' && (
                                        <Input
                                            placeholder="New Area Name (e.g. Downtown)"
                                            className="h-12 bg-blue-50/50 border-blue-100 text-blue-900 rounded-xl font-bold animate-in slide-in-from-top-2"
                                            value={newAreaName}
                                            onChange={e => setNewAreaName(e.target.value)}
                                            required
                                        />
                                    )}
                                </div>

                                {/* Building Selection */}
                                <div className="space-y-4">
                                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Building / Complex</Label>
                                    <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
                                        <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold">
                                            <SelectValue placeholder="Select Building" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new" className="text-blue-600 font-bold">+ Create New Building</SelectItem>
                                            {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {selectedBuildingId === 'new' && (
                                        <div className="space-y-3 animate-in slide-in-from-top-2">
                                            <Input
                                                placeholder="Building Name (e.g. Sunset Heights)"
                                                className="h-12 bg-blue-50/50 border-blue-100 text-blue-900 rounded-xl font-bold"
                                                value={newBuildingName}
                                                onChange={e => setNewBuildingName(e.target.value)}
                                                required
                                            />
                                            <Input
                                                placeholder="Street Address"
                                                className="h-12 bg-blue-50/50 border-blue-100 text-blue-900 rounded-xl font-medium"
                                                value={newBuildingAddress}
                                                onChange={e => setNewBuildingAddress(e.target.value)}
                                                required
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Unit Details */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-black text-slate-900 border-b pb-2 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-emerald-500" /> Unit Specs
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Unit Number</Label>
                                    <Input
                                        placeholder="e.g. 4B"
                                        className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold"
                                        value={unitNumber}
                                        onChange={e => setUnitNumber(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Rent ($)</Label>
                                    <Input
                                        type="number"
                                        placeholder="2500"
                                        className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold"
                                        value={rent}
                                        onChange={e => setRent(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Beds</Label>
                                    <Input
                                        type="number"
                                        placeholder="2"
                                        className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold"
                                        value={bedrooms}
                                        onChange={e => setBedrooms(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Baths</Label>
                                    <Input
                                        type="number"
                                        placeholder="1.5"
                                        className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold"
                                        value={bathrooms}
                                        onChange={e => setBathrooms(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Square Feet</Label>
                                    <Input
                                        type="number"
                                        placeholder="1200"
                                        className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold"
                                        value={sqft}
                                        onChange={e => setSqft(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-95 text-xs"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Provision Asset to Database'}
                        </Button>

                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
