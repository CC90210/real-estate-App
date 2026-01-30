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
import { Loader2, Plus, Building2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const buildingSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    address: z.string().min(5, "Please enter a valid address"),
    area_id: z.string().uuid("Invalid Area selected"),
});

type BuildingFormValues = z.infer<typeof buildingSchema>;

interface AddBuildingModalProps {
    areaId: string;
    areaName: string;
}

export function AddBuildingModal({ areaId, areaName }: AddBuildingModalProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const { register, handleSubmit, reset, formState: { errors } } = useForm<BuildingFormValues>({
        resolver: zodResolver(buildingSchema),
        defaultValues: {
            name: '',
            address: '',
            area_id: areaId,
        }
    });

    const onSubmit = async (data: BuildingFormValues) => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('buildings')
                .insert({
                    name: data.name,
                    address: data.address,
                    area_id: data.area_id,
                    amenities: [] // Default empty
                });

            if (error) throw error;

            // Log activity
            await supabase.from('activity_log').insert({
                action: 'BUILDING_CREATED',
                description: `Added building ${data.name} to ${areaName}`
            });

            toast.success(`${data.name} added to ${areaName}`);
            setOpen(false);
            reset();
            router.refresh();
        } catch (error: any) {
            toast.error("Failed to add building: " + error.message);
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
                <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all hover:scale-[1.02]">
                    <Plus className="w-4 h-4 mr-2" /> Add Building
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        Add New Building
                    </DialogTitle>
                    <DialogDescription>
                        Register a new property building within <strong>{areaName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="className">Building Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Skyline Towers"
                                {...register('name')}
                                className={errors.name ? "border-red-500" : ""}
                            />
                            {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Physical Address</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <Input
                                    id="address"
                                    placeholder="123 Example St, City, ST"
                                    className={`pl-10 ${errors.address ? "border-red-500" : ""}`}
                                    {...register('address')}
                                />
                            </div>
                            {errors.address && <p className="text-xs text-red-500 font-medium">{errors.address.message}</p>}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...
                                </>
                            ) : "Add Building"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
