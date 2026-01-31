'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { updatePropertyAction } from '@/lib/actions/property-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface EditPropertyModalProps {
    property: any; // Using any for speed, but ideally strictly typed
}

export function EditPropertyModal({ property }: EditPropertyModalProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    // Form State
    const [rent, setRent] = useState(property.rent);
    const [lockbox, setLockbox] = useState(property.lockbox_code || '');
    const [description, setDescription] = useState(property.description || '');
    const [status, setStatus] = useState(property.status);

    // Image State
    const [uploading, setUploading] = useState(false);
    const [photos, setPhotos] = useState<string[]>(property.photos || []);

    const handleUpdate = async () => {
        setIsLoading(true);
        try {
            const formData = {
                rent: parseFloat(rent),
                lockbox_code: lockbox,
                description,
                status,
                photos
            };

            const result = await updatePropertyAction(property.id, formData);

            if (!result.success) {
                throw new Error(result.error);
            }

            toast.success("Property updated successfully");
            setOpen(false);
            router.refresh();
        } catch (error: any) {
            toast.error("Failed to update: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${property.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('properties')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('properties')
                .getPublicUrl(filePath);

            setPhotos([...photos, publicUrl]);
            toast.success("Image uploaded!");
        } catch (error: any) {
            console.error("Upload error:", error);
            toast.error("Upload failed. Ensure 'properties' bucket exists.");
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (index: number) => {
        const newPhotos = [...photos];
        newPhotos.splice(index, 1);
        setPhotos(newPhotos);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" /> Edit Property
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Property Details</DialogTitle>
                    <DialogDescription>
                        Update key information for {property.address}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Monthly Rent ($)</Label>
                            <Input
                                type="number"
                                value={rent}
                                onChange={(e) => setRent(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Lockbox Code (Secure)</Label>
                            <Input
                                type="text"
                                value={lockbox}
                                onChange={(e) => setLockbox(e.target.value)}
                                className="font-mono bg-yellow-50/50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Status</Label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="available">Available</option>
                            <option value="rented">Rented</option>
                            <option value="pending">Pending</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                    </div>

                    <div className="space-y-4">
                        <Label>Photo Gallery</Label>
                        <div className="grid grid-cols-3 gap-4">
                            {photos.map((photo, i) => (
                                <div key={i} className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden group">
                                    <img src={photo} alt="Property" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removePhoto(i)}
                                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                {uploading ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                ) : (
                                    <>
                                        <Upload className="w-6 h-6 text-slate-400 mb-2" />
                                        <span className="text-xs text-slate-500 font-medium">Add Photo</span>
                                    </>
                                )}
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdate} disabled={isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
