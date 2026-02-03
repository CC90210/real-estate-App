'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { updatePropertyAction } from '@/lib/actions/property-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Loader2, Upload, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

interface EditPropertyModalProps {
    property: any;
}

// Common amenities for real estate
const AMENITY_OPTIONS = [
    'Air Conditioning',
    'Heating',
    'In-Unit Laundry',
    'Dishwasher',
    'Parking',
    'Gym',
    'Pool',
    'Balcony',
    'Patio',
    'Storage',
    'Elevator',
    'Doorman',
    'Pet Friendly',
    'Furnished',
    'Hardwood Floors',
    'Stainless Steel Appliances',
    'Granite Counters',
    'Walk-in Closet',
    'Fireplace',
    'Central Vacuum'
];

export function EditPropertyModal({ property }: EditPropertyModalProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    // Form State - Core
    const [rent, setRent] = useState(property.rent?.toString() || '');
    const [lockbox, setLockbox] = useState(property.lockbox_code || '');
    const [description, setDescription] = useState(property.description || '');
    const [status, setStatus] = useState(property.status || 'available');

    // Form State - Details (NEW)
    const [bedrooms, setBedrooms] = useState(property.bedrooms?.toString() || '');
    const [bathrooms, setBathrooms] = useState(property.bathrooms?.toString() || '');
    const [squareFeet, setSquareFeet] = useState(property.square_feet?.toString() || '');
    const [deposit, setDeposit] = useState(property.deposit?.toString() || property.rent?.toString() || '');
    const [availableDate, setAvailableDate] = useState(
        property.available_date
            ? new Date(property.available_date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    );

    // Form State - Amenities (NEW)
    const [amenities, setAmenities] = useState<string[]>(property.amenities || []);
    const [customAmenity, setCustomAmenity] = useState('');

    // Image State
    const [uploading, setUploading] = useState(false);
    const [photos, setPhotos] = useState<string[]>(property.photos || []);

    const handleUpdate = async () => {
        setIsLoading(true);
        try {
            const formData = {
                rent: parseFloat(rent) || 0,
                lockbox_code: lockbox,
                description,
                status,
                photos,
                // NEW fields
                bedrooms: parseInt(bedrooms) || 0,
                bathrooms: parseFloat(bathrooms) || 0,
                square_feet: parseInt(squareFeet) || 0,
                deposit: parseFloat(deposit) || parseFloat(rent) || 0,
                available_date: availableDate,
                amenities: amenities
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

    const toggleAmenity = (amenity: string) => {
        if (amenities.includes(amenity)) {
            setAmenities(amenities.filter(a => a !== amenity));
        } else {
            setAmenities([...amenities, amenity]);
        }
    };

    const addCustomAmenity = () => {
        if (customAmenity.trim() && !amenities.includes(customAmenity.trim())) {
            setAmenities([...amenities, customAmenity.trim()]);
            setCustomAmenity('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" /> Edit Property
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Property Details</DialogTitle>
                    <DialogDescription>
                        Update information for {property.address}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Row 1: Rent, Deposit, Lockbox */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Monthly Rent ($)</Label>
                            <Input
                                type="number"
                                value={rent}
                                onChange={(e) => setRent(e.target.value)}
                                placeholder="2500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Security Deposit ($)</Label>
                            <Input
                                type="number"
                                value={deposit}
                                onChange={(e) => setDeposit(e.target.value)}
                                placeholder="2500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Lockbox Code</Label>
                            <Input
                                type="text"
                                value={lockbox}
                                onChange={(e) => setLockbox(e.target.value)}
                                className="font-mono bg-yellow-50/50"
                                placeholder="1234"
                            />
                        </div>
                    </div>

                    {/* Row 2: Bedrooms, Bathrooms, Sq Ft */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Bedrooms</Label>
                            <Input
                                type="number"
                                value={bedrooms}
                                onChange={(e) => setBedrooms(e.target.value)}
                                placeholder="2"
                                min="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Bathrooms</Label>
                            <Input
                                type="number"
                                step="0.5"
                                value={bathrooms}
                                onChange={(e) => setBathrooms(e.target.value)}
                                placeholder="1.5"
                                min="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Square Feet</Label>
                            <Input
                                type="number"
                                value={squareFeet}
                                onChange={(e) => setSquareFeet(e.target.value)}
                                placeholder="1200"
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Row 3: Status, Available Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="available">Available</option>
                                <option value="rented">Rented</option>
                                <option value="pending">Pending</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Available Date</Label>
                            <Input
                                type="date"
                                value={availableDate}
                                onChange={(e) => setAvailableDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Describe the property features, views, recent updates..."
                        />
                    </div>

                    {/* Amenities Section */}
                    <div className="space-y-3">
                        <Label>Amenities</Label>
                        <div className="flex flex-wrap gap-2">
                            {AMENITY_OPTIONS.map((amenity) => (
                                <Badge
                                    key={amenity}
                                    variant={amenities.includes(amenity) ? "default" : "outline"}
                                    className={`cursor-pointer transition-all ${amenities.includes(amenity)
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'hover:bg-slate-100'
                                        }`}
                                    onClick={() => toggleAmenity(amenity)}
                                >
                                    {amenity}
                                </Badge>
                            ))}
                        </div>

                        {/* Custom Amenity Input */}
                        <div className="flex gap-2 mt-3">
                            <Input
                                placeholder="Add custom amenity..."
                                value={customAmenity}
                                onChange={(e) => setCustomAmenity(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity())}
                                className="flex-1"
                            />
                            <Button type="button" variant="outline" size="icon" onClick={addCustomAmenity}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Selected Amenities Display */}
                        {amenities.length > 0 && (
                            <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-500 mb-2">Selected ({amenities.length}):</p>
                                <div className="flex flex-wrap gap-1">
                                    {amenities.map((a) => (
                                        <Badge key={a} variant="secondary" className="text-xs">
                                            {a}
                                            <button
                                                onClick={() => toggleAmenity(a)}
                                                className="ml-1 hover:text-red-500"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Photo Gallery */}
                    <div className="space-y-4">
                        <Label>Photo Gallery</Label>
                        <div className="grid grid-cols-4 gap-4">
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

                <div className="flex justify-end gap-2 pt-4 border-t">
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
