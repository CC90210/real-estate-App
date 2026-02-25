'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
import { logActivity } from '@/lib/services/activity-logger';
import { useAuth } from '@/lib/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Building2, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const buildingSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    address: z.string().min(5, "Please enter a valid address"),
    area_id: z.string().uuid("Invalid Area selected"),
    image_url: z.string().optional(),
    amenities: z.array(z.string()).optional(),
});

type BuildingFormValues = z.infer<typeof buildingSchema>;

interface AddBuildingModalProps {
    areaId: string;
    areaName: string;
}

const COMMON_AMENITIES = [
    "HVAC", "Secure Access", "Parking", "Gym", "Pool", "Elevator", "Doorman", "Roof Deck", "Laundry"
];

export function AddBuildingModal({ areaId, areaName }: AddBuildingModalProps) {
    const { company, profile } = useAuth();
    const [open, setOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [amenityInput, setAmenityInput] = useState('');

    const supabase = createClient();
    const queryClient = useQueryClient();
    const { colors } = useAccentColor();

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BuildingFormValues>({
        resolver: zodResolver(buildingSchema),
        defaultValues: {
            name: '',
            address: '',
            area_id: areaId,
            image_url: '',
            amenities: []
        }
    });

    const currentAmenities = watch('amenities') || [];

    const onImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !company?.id) return;

        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${company.id}/building-${Date.now()}.${fileExt}`;
        const filePath = `buildings/${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('properties')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('properties')
                .getPublicUrl(filePath);

            setValue('image_url', publicUrl);
            setPreviewUrl(publicUrl);
            toast.success("Image uploaded");
        } catch (error: any) {
            toast.error("Upload failed: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const addAmenity = (amenity: string) => {
        if (!amenity) return;
        const current = watch('amenities') || [];
        if (!current.includes(amenity)) {
            setValue('amenities', [...current, amenity]);
        }
        setAmenityInput('');
    };

    const removeAmenity = (amenity: string) => {
        const current = watch('amenities') || [];
        setValue('amenities', current.filter(a => a !== amenity));
    };

    const createBuildingMutation = useMutation({
        mutationFn: async (data: BuildingFormValues) => {
            const { data: newBuilding, error } = await supabase
                .from('buildings')
                .insert({
                    name: data.name,
                    address: data.address,
                    area_id: data.area_id,
                    company_id: company?.id,
                    image_url: data.image_url,
                    amenities: data.amenities || []
                })
                .select()
                .single();

            if (error) throw error;
            return newBuilding;
        },
        onMutate: async (newBuilding) => {
            await queryClient.cancelQueries({ queryKey: ['area-buildings', areaId] });
            await queryClient.cancelQueries({ queryKey: ['areas'] });

            const previousBuildings = queryClient.getQueryData(['area-buildings', areaId]);

            queryClient.setQueryData(['area-buildings', areaId], (old: any[] = []) => {
                const tempBuilding = {
                    id: `temp-${Date.now()}`,
                    name: newBuilding.name,
                    address: newBuilding.address,
                    area_id: newBuilding.area_id,
                    image_url: newBuilding.image_url,
                    amenities: newBuilding.amenities || [],
                    company_id: company?.id,
                    created_at: new Date().toISOString(),
                    properties: []
                };
                return [...old, tempBuilding];
            });

            toast.success(`${newBuilding.name} - Instant Deployed`);
            setOpen(false);
            reset();
            setPreviewUrl(null);

            return { previousBuildings };
        },
        onError: (err, newBuilding, context) => {
            queryClient.setQueryData(['area-buildings', areaId], context?.previousBuildings);
            toast.error("Failed to add building: " + err.message);
            setOpen(true);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['area-buildings', areaId] });
            queryClient.invalidateQueries({ queryKey: ['areas'] });
        },
        onSuccess: async (data) => {
            if (company?.id && profile?.id) {
                await logActivity(supabase, {
                    companyId: company.id,
                    userId: profile.id,
                    action: 'BUILDING_CREATED',
                    entityType: 'building',
                    entityId: data.id,
                    description: `Created building ${data.name} in ${areaName}`,
                    details: { name: data.name, area: areaName }
                });
            }
        }
    });

    const onSubmit = (data: BuildingFormValues) => {
        if (!company?.id) {
            toast.error("Company profile not loaded");
            return;
        }
        createBuildingMutation.mutate(data);
    };

    const isPending = createBuildingMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
                reset();
                setPreviewUrl(null);
            }
        }}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all hover:scale-[1.02]">
                    <Plus className="w-4 h-4 mr-2" /> Add Building
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg bg-white">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Building Name</Label>
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
                            <Input
                                id="address"
                                placeholder="123 Example St"
                                className={errors.address ? "border-red-500" : ""}
                                {...register('address')}
                            />
                            {errors.address && <p className="text-xs text-red-500 font-medium">{errors.address.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Building Image (Optional)</Label>
                        <div className="flex items-center gap-4">
                            <div className="relative w-20 h-20 bg-slate-100 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Building2 className="w-8 h-8 text-slate-300" />
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                        <Loader2 className={cn("w-5 h-5 animate-spin", colors.text)} />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <Input type="file" accept="image/*" onChange={onImageUpload} disabled={uploading} className="text-xs" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Amenities</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {currentAmenities.map((amenity) => (
                                <Badge key={amenity} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 group">
                                    {amenity}
                                    <button
                                        type="button"
                                        onClick={() => removeAmenity(amenity)}
                                        className="hover:text-red-500 focus:outline-none transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add custom amenity..."
                                value={amenityInput}
                                onChange={(e) => setAmenityInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addAmenity(amenityInput);
                                    }
                                }}
                            />
                            <Button type="button" variant="secondary" onClick={() => addAmenity(amenityInput)}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {COMMON_AMENITIES.map(amenity => (
                                <button
                                    key={amenity}
                                    type="button"
                                    onClick={() => addAmenity(amenity)}
                                    className={cn(
                                        "text-xs px-2 py-1 rounded-full border transition-all",
                                        currentAmenities.includes(amenity)
                                            ? "bg-slate-100 text-slate-400 border-slate-100 cursor-default"
                                            : "border-slate-200 hover:border-blue-500 hover:text-blue-600 bg-white"
                                    )}
                                    disabled={currentAmenities.includes(amenity)}
                                >
                                    {amenity}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" className={cn("text-white min-w-[120px]", colors.bg, `hover:${colors.bgHover}`)} disabled={isPending || uploading}>
                            {isPending ? (
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
