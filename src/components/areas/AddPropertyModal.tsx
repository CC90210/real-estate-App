'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Home, DollarSign, Bed, Bath, Move } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const propertySchema = z.object({
    unit_number: z.string().min(1, "Unit number is required"),
    rent: z.string().transform((val) => parseFloat(val)).refine((val) => val > 0, "Rent must be positive"),
    bedrooms: z.string().transform((val) => parseInt(val)).refine((val) => val >= 0, "Bedrooms cannot be negative"),
    bathrooms: z.string().transform((val) => parseFloat(val)).refine((val) => val >= 0, "Bathrooms cannot be negative"),
    square_feet: z.string().transform((val) => parseInt(val)).optional(),
    description: z.string().optional(),
    building_id: z.string().uuid(),
    address: z.string()
});

type PropertyFormValues = z.infer<typeof propertySchema>;

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

    const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
        resolver: zodResolver(propertySchema),
        defaultValues: {
            unit_number: '',
            rent: '',
            bedrooms: '1',
            bathrooms: '1',
            square_feet: '',
            description: '',
            building_id: buildingId,
            address: buildingAddress
        }
    });

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            // Address for property is Building Address + Unit Number
            const fullAddress = `${buildingAddress}, Unit ${data.unit_number}`;

            const { error } = await supabase
                .from('properties')
                .insert({
                    building_id: data.building_id,
                    unit_number: data.unit_number,
                    address: fullAddress,
                    rent: parseFloat(data.rent),
                    bedrooms: parseInt(data.bedrooms),
                    bathrooms: parseFloat(data.bathrooms),
                    square_feet: data.square_feet ? parseInt(data.square_feet) : null,
                    description: data.description,
                    status: 'available',
                });

            if (error) throw error;

            // Log activity
            await supabase.from('activity_log').insert({
                action: 'PROPERTY_CREATED',
                description: `Created Unit ${data.unit_number} in ${buildingName}`
            });

            toast.success(`Unit ${data.unit_number} added to ${buildingName}`);
            setOpen(false);
            reset();
            router.refresh();
        } catch (error: any) {
            toast.error("Failed to add property: " + error.message);
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
                <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-md">
                    <Plus className="w-4 h-4 mr-2" /> Add Unit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Home className="w-5 h-5 text-blue-600" />
                        Add New Unit
                    </DialogTitle>
                    <DialogDescription>
                        Create a new property listing for <strong>{buildingName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="unit_number">Unit / Suite Number</Label>
                            <Input
                                id="unit_number"
                                placeholder="e.g. 402"
                                {...register('unit_number')}
                                className={errors.unit_number ? "border-red-500" : ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="rent">Monthly Rent ($)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <Input
                                    id="rent"
                                    type="number"
                                    placeholder="2500"
                                    className={`pl-10 ${errors.rent ? "border-red-500" : ""}`}
                                    {...register('rent')}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="bedrooms">Bedrooms</Label>
                            <div className="relative">
                                <Bed className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <Input
                                    id="bedrooms"
                                    type="number"
                                    className={`pl-10 ${errors.bedrooms ? "border-red-500" : ""}`}
                                    {...register('bedrooms')}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bathrooms">Bathrooms</Label>
                            <div className="relative">
                                <Bath className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <Input
                                    id="bathrooms"
                                    type="number"
                                    step="0.5"
                                    className={`pl-10 ${errors.bathrooms ? "border-red-500" : ""}`}
                                    {...register('bathrooms')}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="square_feet">Sq Ft</Label>
                            <div className="relative">
                                <Move className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <Input
                                    id="square_feet"
                                    type="number"
                                    className={`pl-10 ${errors.square_feet ? "border-red-500" : ""}`}
                                    {...register('square_feet')}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Public Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe features, views, and renovations..."
                            rows={3}
                            {...register('description')}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
                                </>
                            ) : "Create Unit"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
