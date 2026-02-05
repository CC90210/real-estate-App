'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Save, X, Building2, MapPin, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

const buildingSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    address: z.string().min(5, "Please enter a valid address"),
    image_url: z.string().optional(),
    amenities: z.array(z.string()).optional(),
});

type BuildingFormValues = z.infer<typeof buildingSchema>;

interface EditBuildingModalProps {
    building: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const COMMON_AMENITIES = [
    "HVAC", "Secure Access", "Parking", "Gym", "Pool", "Elevator", "Doorman", "Roof Deck", "Laundry"
];

export function EditBuildingModal({ building, open, onOpenChange }: EditBuildingModalProps) {
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [amenityInput, setAmenityInput] = useState('');
    const { colors } = useAccentColor();

    const { user, profile, company } = useAuth();
    const supabase = createClient();
    const queryClient = useQueryClient();

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<BuildingFormValues>({
        resolver: zodResolver(buildingSchema),
        defaultValues: {
            name: '',
            address: '',
            image_url: '',
            amenities: []
        }
    });

    const currentAmenities = watch('amenities') || [];

    useEffect(() => {
        if (open && building) {
            reset({
                name: building.name || '',
                address: building.address || '',
                image_url: building.image_url || '',
                amenities: building.amenities || []
            });
            setPreviewUrl(building.image_url || null);
        }
    }, [open, building, reset]);

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
            toast.success("Building image uploaded");
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

    const updateBuildingMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: BuildingFormValues }) => {
            const { data: updatedBuilding, error } = await supabase
                .from('buildings')
                .update({
                    name: data.name,
                    address: data.address,
                    image_url: data.image_url,
                    amenities: data.amenities
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return updatedBuilding;
        },
        onMutate: async ({ id, data }) => {
            // Optimistic Update
            await queryClient.cancelQueries({ queryKey: ['area-buildings', building?.area_id] });
            const previousBuildings = queryClient.getQueryData(['area-buildings', building?.area_id]);

            queryClient.setQueryData(['area-buildings', building?.area_id], (old: any[] = []) => {
                return old.map(b => b.id === id ? { ...b, ...data } : b);
            });

            onOpenChange(false);
            toast.success("Building updated instantly!");
            return { previousBuildings };
        },
        onError: (err, _, context) => {
            queryClient.setQueryData(['area-buildings', building?.area_id], context?.previousBuildings);
            toast.error("Update failed: " + err.message);
            onOpenChange(true);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['area-buildings', building?.area_id] });
        }
    });

    const onSubmit = (data: BuildingFormValues) => {
        if (!building?.id) return;
        updateBuildingMutation.mutate({ id: building.id, data });
    };

    const isPending = updateBuildingMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg bg-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        Edit Building
                    </DialogTitle>
                    <DialogDescription>
                        Update details for <strong>{building?.name}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="className">Building Name</Label>
                            <Input id="name" {...register('name')} className={errors.name ? "border-red-500" : ""} />
                            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input id="address" {...register('address')} className={errors.address ? "border-red-500" : ""} />
                            {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Building Image</Label>
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
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" className={cn("text-white min-w-[120px]", colors.bg, `hover:${colors.bgHover}`)} disabled={isPending || uploading}>
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
