'use client';

import { motion } from 'framer-motion';
import { useProperty } from '@/lib/hooks/useProperties';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    ArrowLeft,
    MapPin,
    Bed,
    Bath,
    Ruler,
    Calendar,
    Car,
    PawPrint,
    Zap,
    Building2
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { PhotoCarousel } from '@/components/properties/PhotoCarousel';
import { LockboxCode } from '@/components/properties/LockboxCode';
import { FAB } from '@/components/common/FAB';
import { GenerateAdModal } from '@/components/common/GenerateAdModal';
import { formatCurrency, formatSqFt, formatDate, getStatusVariant } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';

export default function PropertyDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const propertyId = params.propertyId as string;

    const { data: property, isLoading } = useProperty(propertyId);
    const [adModalOpen, setAdModalOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="space-y-8">
                <Skeleton className="w-full h-[400px] rounded-xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <Skeleton className="h-12 w-2/3" />
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-48 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!property) return <div className="text-center py-20">Property not found</div>;

    const handleNewApplication = () => {
        // In a real app, this would open a modal or redirect
        toast.message('Starting new application...');
        router.push(`/applications/new?propertyId=${propertyId}`);
    };

    return (
        <div className="pb-20 relative">
            {/* Back Button */}
            <Button
                variant="ghost"
                className="mb-4 pl-0 hover:pl-2 transition-all"
                onClick={() => router.back()}
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
            </Button>

            <div className="space-y-8">
                {/* Photo Carousel */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <PhotoCarousel photos={property.photos || []} />
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2 space-y-8"
                    >
                        {/* Header */}
                        <div>
                            <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                                <h1 className="text-3xl sm:text-4xl font-bold">
                                    {property.address} <span className="text-muted-foreground font-normal">#{property.unit_number}</span>
                                </h1>
                                <div className="flex flex-col items-end">
                                    <h2 className="text-3xl font-bold text-primary">
                                        {formatCurrency(property.rent)}
                                        <span className="text-lg text-muted-foreground font-normal">/mo</span>
                                    </h2>
                                    <Badge variant={getStatusVariant(property.status)} className="mt-2 text-md px-3 py-1">
                                        {property.status}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex items-center text-muted-foreground">
                                <MapPin className="w-4 h-4 mr-1" />
                                {property.building?.area?.name}, {property.building?.name}
                            </div>
                        </div>

                        {/* Quick Stats Row */}
                        <div className="grid grid-cols-3 sm:grid-cols-3 gap-4 border-y py-6">
                            <div className="flex flex-col items-center justify-center p-2 text-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <Bed className="w-6 h-6 text-primary" />
                                    <span className="text-xl font-bold">{property.bedrooms}</span>
                                </div>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Bedrooms</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 text-center border-x">
                                <div className="flex items-center gap-2 mb-1">
                                    <Bath className="w-6 h-6 text-primary" />
                                    <span className="text-xl font-bold">{property.bathrooms}</span>
                                </div>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Bathrooms</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 text-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <Ruler className="w-6 h-6 text-primary" />
                                    <span className="text-xl font-bold">{formatSqFt(property.square_feet).replace(' sq ft', '')}</span>
                                </div>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Square Ft</span>
                            </div>
                        </div>

                        {/* Lockbox Section */}
                        <LockboxCode code={property.lockbox_code} />

                        {/* Description */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold">Description</h3>
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {property.description || "No description available for this property."}
                            </p>
                        </div>

                        {/* Amenities */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold">Features & Amenities</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                                    <Calendar className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <div className="font-medium">Availability</div>
                                        <div className="text-sm text-muted-foreground">
                                            {property.available_date ? formatDate(property.available_date) : 'Contact for details'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                                    <Car className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <div className="font-medium">Parking</div>
                                        <div className="text-sm text-muted-foreground">
                                            {property.parking_included ? 'Included' : 'Not included'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                                    <PawPrint className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <div className="font-medium">Pet Policy</div>
                                        <div className="text-sm text-muted-foreground">
                                            {property.pet_policy || 'Contact for details'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                                    <Zap className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <div className="font-medium">Utilities</div>
                                        <div className="text-sm text-muted-foreground">
                                            {property.utilities_included && property.utilities_included.length > 0
                                                ? property.utilities_included.join(', ')
                                                : 'Tenant responsibility'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Sidebar Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-6"
                    >
                        {/* Building Card */}
                        <div className="bg-card border rounded-xl p-6 shadow-sm">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                Building Information
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm text-muted-foreground">Name</div>
                                    <div className="font-medium">{property.building?.name}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Address</div>
                                    <div className="font-medium">{property.building?.address}</div>
                                </div>
                                <Separator />
                                <div>
                                    <div className="text-sm text-muted-foreground mb-2">Building Amenities</div>
                                    <div className="flex flex-wrap gap-2">
                                        {property.building?.amenities?.map((amenity) => (
                                            <Badge key={amenity} variant="secondary" className="text-xs">
                                                {amenity}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => router.push(`/areas/${property.building?.area_id}/buildings/${property.building_id}`)}
                                >
                                    View Building
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Floating Action Button */}
            <FAB
                onGenerateAd={() => setAdModalOpen(true)}
                onNewApplication={handleNewApplication}
            />

            {/* Modals */}
            <GenerateAdModal
                property={property}
                open={adModalOpen}
                onOpenChange={setAdModalOpen}
            />
        </div>
    );
}
