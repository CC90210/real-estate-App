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
import { Loader2, Plus, Home, DollarSign, Bed, Bath, Move, User, Building, Calendar, Key, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { propertySchema, PropertyFormValues } from '@/lib/schemas/property-schema';
import { useUser } from '@/lib/hooks/useUser';
import { useLandlords } from '@/lib/hooks/useProperties';

interface AddPropertyModalProps {
    buildingId: string;
    buildingName: string;
    buildingAddress: string;
}

export function AddPropertyModal({ buildingId, buildingName, buildingAddress }: AddPropertyModalProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();
    const { profile, user } = useUser();
    const { data: landlords, isLoading: isLoadingLandlords } = useLandlords();

    // Determine default Landlord Logic
    // If user is Landlord, try to find their matching record in Landlords table by email
    const [defaultLandlordId, setDefaultLandlordId] = useState<string>('');
    const [isLandlordLocked, setIsLandlordLocked] = useState(false);

    useEffect(() => {
        if (profile?.role === 'landlord' && landlords) {
            const myLandlordRecord = landlords.find(l => l.email === profile.email);
            if (myLandlordRecord) {
                setDefaultLandlordId(myLandlordRecord.id);
                setIsLandlordLocked(true);
            }
        }
    }, [profile, landlords]);

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<any>({
        resolver: zodResolver(propertySchema),
        defaultValues: {
            unit_number: '',
            address: buildingAddress,
            rent: 2000,
            deposit: 2000,
            bedrooms: 1,
            bathrooms: 1,
            square_feet: 600,
            description: '',
            amenities: [],
            available_date: new Date(),
            building_id: buildingId,
            landlord_id: defaultLandlordId || '', // Handle initial empty state
            company_id: profile?.company_id || '',
            status: 'available'
        }
    });

    // Update form when defaults are resolved
    useEffect(() => {
        if (defaultLandlordId) setValue('landlord_id', defaultLandlordId);
        if (profile?.company_id) setValue('company_id', profile.company_id);
    }, [defaultLandlordId, profile?.company_id, setValue]);

    const onSubmit: import('react-hook-form').SubmitHandler<PropertyFormValues> = async (data) => {
        setIsLoading(true);
        try {
            // 1. Data Integrity Checks
            if (!profile?.company_id) {
                throw new Error("Critical Error: No Company ID found in user session. Please contact support.");
            }
            if (!data.landlord_id) {
                throw new Error("Validation Error: A Landlord must be assigned to this property.");
            }

            // 2. Format Payload
            const fullAddress = `${buildingAddress}, Unit ${data.unit_number}`;

            // 3. Database Insertion (The 'propertySchema' ensures all fields are correct types)
            const { error } = await supabase
                .from('properties')
                .insert({
                    ...data,
                    address: fullAddress, // Override with computed address
                    company_id: profile.company_id, // Force Override from Session (Security)
                    landlord_id: data.landlord_id, // Explicit assignment
                    amenities: data.amenities || []
                });

            if (error) throw error;

            toast.success(`Unit ${data.unit_number} created successfully`);
            setOpen(false);
            reset();
            router.refresh();

        } catch (error: any) {
            console.error("Submission Error:", error);
            toast.error(error.message || "Failed to create property");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) reset();
        }}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all">
                    <Plus className="w-4 h-4 mr-2" /> Add Unit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b pb-4 mb-4">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                        <Building className="w-6 h-6 text-blue-600" />
                        Add New Unit
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Adding to <strong>{buildingName}</strong> • {buildingAddress}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* SECTION 1: CORE DETAILS */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Home className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-slate-900">Unit Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="unit_number" className="text-slate-700">Unit Number <span className="text-red-500">*</span></Label>
                                <Input
                                    id="unit_number"
                                    placeholder="e.g. 808"
                                    {...register('unit_number')}
                                    className={`bg-white ${errors.unit_number ? "border-red-500 focus:ring-red-200" : "focus:ring-blue-200"}`}
                                />
                                {errors.unit_number && <p className="text-xs text-red-500">{errors.unit_number.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="landlord" className="text-slate-700">Assign Landlord <span className="text-red-500">*</span></Label>
                                {isLandlordLocked ? (
                                    <div className="flex items-center gap-2 h-10 px-3 py-2 w-full rounded-md border border-slate-200 bg-slate-100 text-sm text-slate-500 cursor-not-allowed">
                                        <User className="w-4 h-4" />
                                        You (Self-Assigned)
                                        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                                    </div>
                                ) : (
                                    <Select
                                        onValueChange={(val) => setValue('landlord_id', val)}
                                        defaultValue={defaultLandlordId}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Select Owner..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {isLoadingLandlords ? (
                                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                                            ) : (
                                                landlords?.map(l => (
                                                    <SelectItem key={l.id} value={l.id}>{l.name} ({l.company_name || 'Individual'})</SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                )}
                                {errors.landlord_id && <p className="text-xs text-red-500">{errors.landlord_id.message}</p>}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: FINANCIALS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="rent">Monthly Rent ($)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <Input
                                    id="rent"
                                    type="number"
                                    {...register('rent', { valueAsNumber: true })}
                                    className="pl-9"
                                />
                            </div>
                            {errors.rent && <p className="text-xs text-red-500">{errors.rent.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="deposit">Security Deposit ($)</Label>
                            <div className="relative">
                                <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <Input
                                    id="deposit"
                                    type="number"
                                    {...register('deposit', { valueAsNumber: true })}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: SPECS */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Bedrooms</Label>
                            <div className="relative">
                                <Bed className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <Input type="number" {...register('bedrooms', { valueAsNumber: true })} className="pl-9" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Bathrooms</Label>
                            <div className="relative">
                                <Bath className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <Input type="number" step="0.5" {...register('bathrooms', { valueAsNumber: true })} className="pl-9" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Sq Ft</Label>
                            <div className="relative">
                                <Move className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <Input type="number" {...register('square_feet', { valueAsNumber: true })} className="pl-9" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Public Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Highlight features like 'Morning sun', 'Newly renovated'..."
                            className="resize-none"
                            rows={3}
                            {...register('description')}
                        />
                    </div>

                    {/* FOOTER */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> saving...
                                </>
                            ) : "Create Unit"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
