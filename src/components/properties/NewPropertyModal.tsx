'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Home, DollarSign, Bed, Bath, Move, User, Building, MapPin, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { propertySchema, PropertyFormValues } from '@/lib/schemas/property-schema';
import { useUser } from '@/lib/hooks/useUser';
import { useLandlords } from '@/lib/hooks/useProperties';
import { cn } from '@/lib/utils';
import { useAccentColor } from '@/lib/hooks/useAccentColor';

interface NewPropertyModalProps {
    open?: boolean; // Controlled state
    onOpenChange?: (open: boolean) => void;
}

export function NewPropertyModal({ open: controlledOpen, onOpenChange }: NewPropertyModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = controlledOpen ?? internalOpen;
    const setIsOpen = onOpenChange ?? setInternalOpen;

    const [isLoading, setIsLoading] = useState(false);
    const [propertyType, setPropertyType] = useState<'house' | 'complex'>('house');
    const router = useRouter();
    const supabase = createClient();
    const { profile } = useUser();
    const { data: landlords, isLoading: isLoadingLandlords } = useLandlords();
    const { colors } = useAccentColor();

    // Default Landlord Logic
    const [defaultLandlordId, setDefaultLandlordId] = useState<string>('');
    useEffect(() => {
        if (profile?.role === 'landlord' && landlords) {
            const match = landlords.find(l => l.email === profile.email);
            if (match) setDefaultLandlordId(match.id);
        }
    }, [profile, landlords]);

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<any>({
        resolver: zodResolver(propertySchema),
        defaultValues: {
            unit_number: 'Entire House', // Default for SFH
            rent: 2000,
            deposit: 2000,
            bedrooms: 2,
            bathrooms: 2,
            square_feet: 1000,
            amenities: [],
            available_date: new Date(),
            status: 'available',
            city: '',
            state: '',
            zip_code: ''
        }
    });

    // Reset when switching modes
    useEffect(() => {
        if (propertyType === 'house') {
            setValue('unit_number', 'Entire House');
        } else {
            setValue('unit_number', '');
        }
    }, [propertyType, setValue]);

    const onSubmit: import('react-hook-form').SubmitHandler<PropertyFormValues> = async (data) => {
        setIsLoading(true);
        try {
            if (!profile?.company_id) throw new Error("Missing Company ID");
            if (!data.landlord_id) throw new Error("Landlord required");

            // 1. Handle Location / Area
            // For SFH, we need to ensure an 'Area' exists or create a default 'Unassigned' one
            // Ideally, we'd reverse geocode, but for now we'll fetch/create a placeholder Area

            // Try to find an area named after the City, or default.
            let areaId: string | null = null;
            const cityName = data.city || "General Area";

            const { data: existingArea } = await supabase
                .from('areas')
                .select('id')
                .eq('company_id', profile.company_id)
                .eq('name', cityName)
                .single();

            if (existingArea) {
                areaId = existingArea.id;
            } else {
                // Determine image for area based on City (placeholder logic)
                const { data: newArea, error: areaError } = await supabase
                    .from('areas')
                    .insert({
                        company_id: profile.company_id,
                        name: cityName,
                        description: `Properties located in ${cityName}`,
                        image_url: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&q=80'
                    })
                    .select()
                    .single();

                if (areaError) throw areaError;
                areaId = newArea.id;
            }

            // 2. Create Building (The "House" Wrapper)
            const { data: building, error: buildingError } = await supabase
                .from('buildings')
                .insert({
                    company_id: profile.company_id,
                    area_id: areaId,
                    name: data.address, // For SFH, Building Name = Address
                    address: data.address,
                    image_url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80', // Default House Img
                    amenities: []
                })
                .select()
                .single();

            if (buildingError) throw buildingError;

            // 3. Create Unit (The actual "Property")
            const { error: unitError } = await supabase
                .from('properties')
                .insert({
                    ...data,
                    building_id: building.id,
                    company_id: profile.company_id,
                    landlord_id: data.landlord_id,
                    amenities: data.amenities || []
                });

            if (unitError) throw unitError;

            toast.success(propertyType === 'house' ? "House added successfully" : "Unit created");
            setIsOpen(false);
            reset();
            router.refresh();

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create property");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(val) => {
            setIsOpen(val);
            if (!val) reset();
        }}>
            {!controlledOpen && (
                <DialogTrigger asChild>
                    <Button className={cn("text-white shadow-xl transition-all hover:scale-[1.02]", colors.bg, `hover:${colors.bgHover}`)}>
                        <Plus className="w-5 h-5 mr-2" /> New Asset
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-3xl bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        {propertyType === 'house' ? <Home className="w-8 h-8 text-blue-600" /> : <Building className="w-8 h-8 text-indigo-600" />}
                        Register Asset
                    </DialogTitle>
                    <DialogDescription className="text-lg font-medium text-slate-500">
                        Add a new single-family home or complex unit to your portfolio.
                    </DialogDescription>
                </DialogHeader>

                {/* TYPE TOGGLE */}
                <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
                    <button
                        type="button"
                        onClick={() => setPropertyType('house')}
                        className={cn(
                            "flex-1 py-3 px-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                            propertyType === 'house' ? "bg-white shadow-md text-blue-600" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <Home className="w-4 h-4" /> Single Family Home
                    </button>
                    <button
                        type="button"
                        onClick={() => setPropertyType('complex')}
                        className={cn(
                            "flex-1 py-3 px-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                            propertyType === 'complex' ? "bg-white shadow-md text-indigo-600" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <Building className="w-4 h-4" /> Multi-Unit Complex
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                    {/* SECTION: LOCATION */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <MapPin className="w-5 h-5 text-slate-400" />
                            <h3 className="font-bold text-slate-900">Location Details</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Street Address</Label>
                                <Input
                                    id="address"
                                    placeholder="123 Example Blvd"
                                    className="h-12 text-lg font-medium"
                                    {...register('address')}
                                />
                                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message as string}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input id="city" placeholder="Metropolis" {...register('city')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State / Province</Label>
                                <Input id="state" placeholder="NY" {...register('state')} />
                            </div>
                        </div>
                    </div>

                    {/* SECTION: FINANCIALS & UNIT */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <DollarSign className="w-5 h-5 text-slate-400" />
                            <h3 className="font-bold text-slate-900">Financials & Specs</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label>Monthly Rent ($)</Label>
                                <Input
                                    type="number"
                                    className="font-mono"
                                    {...register('rent', { valueAsNumber: true })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Security Deposit ($)</Label>
                                <Input
                                    type="number"
                                    className="font-mono"
                                    {...register('deposit', { valueAsNumber: true })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Unit Number/ID</Label>
                                <Input
                                    {...register('unit_number')}
                                    disabled={propertyType === 'house'}
                                    className={propertyType === 'house' ? "bg-slate-50 text-slate-400" : ""}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Bedrooms</Label>
                                <Input type="number" {...register('bedrooms', { valueAsNumber: true })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Bathrooms</Label>
                                <Input type="number" step="0.5" {...register('bathrooms', { valueAsNumber: true })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Sq Ft</Label>
                                <Input type="number" {...register('square_feet', { valueAsNumber: true })} />
                            </div>
                        </div>
                    </div>

                    {/* SECTION: OWNERSHIP */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <User className="w-5 h-5 text-slate-400" />
                            <h3 className="font-bold text-slate-900">Ownership</h3>
                        </div>
                        <div className="space-y-2">
                            <Label>Assign Owner (Landlord)</Label>
                            <Select onValueChange={(val) => setValue('landlord_id', val)} defaultValue={defaultLandlordId}>
                                <SelectTrigger className="h-12 bg-slate-50 border-0">
                                    <SelectValue placeholder="Select Landlord..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {landlords?.map(l => (
                                        <SelectItem key={l.id} value={l.id}>{l.name} ({l.company_name || 'Individual'})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.landlord_id && <p className="text-red-500 text-xs">Owner assignment is required</p>}
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <Button type="submit" disabled={isLoading} className={cn("h-12 px-8 rounded-xl font-bold shadow-lg text-white", colors.bg, `hover:${colors.bgHover}`)}>
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Register Asset"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
