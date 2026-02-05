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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const areaSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    image_url: z.string().optional(),
});

type AreaFormValues = z.infer<typeof areaSchema>;

interface EditAreaModalProps {
    area: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditAreaModal({ area, open, onOpenChange }: EditAreaModalProps) {
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const { colors } = useAccentColor();

    const { company } = useAuth();
    const supabase = createClient();
    const queryClient = useQueryClient();

    const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<AreaFormValues>({
        resolver: zodResolver(areaSchema),
        defaultValues: {
            name: '',
            description: '',
            image_url: '',
        }
    });

    useEffect(() => {
        if (open && area) {
            reset({
                name: area.name || '',
                description: area.description || '',
                image_url: area.image_url || '',
            });
            setPreviewUrl(area.image_url || null);
        }
    }, [open, area, reset]);

    const onImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !company?.id) return;

        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${company.id}/area-${Date.now()}.${fileExt}`;
        const filePath = `areas/${fileName}`;

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
            toast.success("New image uploaded");
        } catch (error: any) {
            toast.error("Upload failed: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const updateAreaMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: AreaFormValues }) => {
            if (!id) throw new Error("No area selected");

            const { data: updatedArea, error } = await supabase
                .from('areas')
                .update({
                    name: data.name,
                    description: data.description,
                    image_url: data.image_url,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return updatedArea;
        },
        onMutate: async ({ id, data }) => {
            // 1. Cancel outgoing fetches
            await queryClient.cancelQueries({ queryKey: ['areas'] });

            // 2. Snapshot previous data
            const previousAreas = queryClient.getQueryData(['areas']);

            // 3. Optimistically update
            queryClient.setQueryData(['areas'], (old: any[] = []) => {
                return old.map(a => a.id === id ? { ...a, ...data } : a)
                    .sort((a, b) => a.name.localeCompare(b.name));
            });

            // 4. Close modal immediately
            onOpenChange(false);
            toast.success("Area updated instantly!");

            return { previousAreas };
        },
        onError: (err, newArea, context) => {
            queryClient.setQueryData(['areas'], context?.previousAreas);
            toast.error("Update failed: " + err.message);
            onOpenChange(true); // Re-open on error
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['areas'] });
        },
    });

    const onSubmit = (data: AreaFormValues) => {
        if (!area?.id) {
            toast.error("Cannot update: Area ID missing");
            return;
        }
        updateAreaMutation.mutate({ id: area.id, data });
    };

    const isPending = updateAreaMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Edit Area</DialogTitle>
                    <DialogDescription>
                        Update the details for <strong>{area?.name}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Area Name</Label>
                            <Input
                                id="name"
                                placeholder="Area Name"
                                className={errors.name ? "border-red-500" : ""}
                                {...register('name')}
                            />
                            {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="image">Area Image (Optional)</Label>
                            <div className="flex items-center gap-4">
                                <div className="relative w-24 h-24 bg-slate-100 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Plus className="w-6 h-6 text-slate-300" />
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                            <Loader2 className={cn("w-5 h-5 animate-spin", colors.text)} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Input
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        onChange={onImageUpload}
                                        disabled={uploading}
                                        className={cn("text-xs file:border-0 file:rounded-md file:px-2 file:py-1 cursor-pointer", `file:${colors.bgLight}`, `file:${colors.text}`)}
                                    />
                                    <p className="text-[10px] text-slate-500">Square images work best (Max 2MB).</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Details about this location..."
                                rows={3}
                                {...register('description')}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" className={cn("text-white min-w-[120px]", colors.bg, `hover:${colors.bgHover}`)} disabled={isPending || uploading}>
                            {isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" /> Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
