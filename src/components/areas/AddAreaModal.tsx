'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { cn } from '@/lib/utils';

const areaSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    image_url: z.string().optional(),
});

type AreaFormValues = z.infer<typeof areaSchema>;

export function AddAreaModal() {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const { colors } = useAccentColor();


    const { user, profile, company } = useAuth();
    const router = useRouter();
    const supabase = createClient();

    const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<AreaFormValues>({
        resolver: zodResolver(areaSchema),
        defaultValues: {
            name: '',
            description: '',
            image_url: '',
        }
    });

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
            toast.success("Area image uploaded");
        } catch (error: any) {
            toast.error("Upload failed: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const onSubmit = async (data: AreaFormValues) => {
        if (!company?.id) {
            toast.error("Company profile not loaded. Please wait.");
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('areas')
                .insert({
                    name: data.name,
                    description: data.description,
                    image_url: data.image_url,
                    company_id: company.id
                });

            if (error) throw error;

            // Log activity
            await supabase.from('activity_log').insert({
                company_id: company.id,
                user_id: profile?.id,
                action: 'AREA_CREATED',
                entity_type: 'area',
                entity_id: '00000000-0000-0000-0000-000000000000', // Placeholder for now or actual ID if returned
                details: { name: data.name }
            });

            toast.success("Area created successfully");
            setOpen(false);
            reset();
            setPreviewUrl(null);
            router.refresh();
        } catch (error: any) {
            console.error("Creation error:", error);
            toast.error("Creation failed: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
                reset();
                setPreviewUrl(null);
            }
        }}>
            <DialogTrigger asChild>
                <Button className={cn("text-white font-semibold shadow-md", colors.bg, `hover:${colors.bgHover}`)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Area
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Create New Area</DialogTitle>
                    <DialogDescription>
                        Define a new geographic region for property organization.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Area Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Downtown Core"
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
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" className={cn("text-white min-w-[120px]", colors.bg, `hover:${colors.bgHover}`)} disabled={isLoading || uploading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
                                </>
                            ) : "Create Area"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
