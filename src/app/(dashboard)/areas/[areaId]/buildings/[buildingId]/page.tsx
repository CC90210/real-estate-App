'use client';

import { motion } from 'framer-motion';
import { useBuilding, useProperties } from '@/lib/hooks/useProperties';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Building2,
    Search,
    ArrowLeft,
    Bed,
    Bath,
    Ruler,
    Filter
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatBedBath, getStatusVariant, formatSqFt } from '@/lib/utils';
import Image from 'next/image';

export default function PropertiesListPage() {
    const params = useParams();
    const router = useRouter();
    const areaId = params.areaId as string;
    const buildingId = params.buildingId as string;

    const { data: building, isLoading: buildingLoading } = useBuilding(buildingId);
    const { data: properties, isLoading: propertiesLoading } = useProperties(buildingId);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [bedFilter, setBedFilter] = useState('all');

    // Filter properties
    const filteredProperties = properties?.filter((property) => {
        const matchesSearch = property.unit_number.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || property.status === statusFilter;
        const matchesBeds = bedFilter === 'all' || property.bedrooms.toString() === bedFilter;

        return matchesSearch && matchesStatus && matchesBeds;
    });

    if (buildingLoading || propertiesLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-1/3 bg-muted rounded animate-pulse" />
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!building) return <div>Building not found</div>;

    return (
        <div className="space-y-6">
            {/* Breadcrumb & Header */}
            <div>
                <div className="flex items-center text-sm text-muted-foreground mb-2">
                    <Link href="/areas" className="hover:text-primary">Areas</Link>
                    <span className="mx-2">/</span>
                    <Link href={`/areas/${areaId}`} className="hover:text-primary">{building.area?.name}</Link>
                    <span className="mx-2">/</span>
                    <span>{building.name}</span>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{building.name} Properties</h1>
                            <p className="text-muted-foreground mt-1">
                                {building.address}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="glass p-4 rounded-xl flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search unit number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            <SelectValue placeholder="Status" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rented">Rented</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={bedFilter} onValueChange={setBedFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Bedrooms" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Bedrooms</SelectItem>
                        <SelectItem value="0">Studio</SelectItem>
                        <SelectItem value="1">1 Bedroom</SelectItem>
                        <SelectItem value="2">2 Bedrooms</SelectItem>
                        <SelectItem value="3">3 Bedrooms</SelectItem>
                        <SelectItem value="4">4+ Bedrooms</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Properties List */}
            <div className="grid grid-cols-1 gap-4">
                {filteredProperties?.map((property, index) => (
                    <motion.div
                        key={property.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <Link href={`/properties/${property.id}`}>
                            <Card className="card-hover overflow-hidden border-0 shadow-sm">
                                <div className="flex flex-col sm:flex-row">
                                    {/* Thumbnail */}
                                    <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-muted">
                                        {property.photos && property.photos.length > 0 ? (
                                            <Image
                                                src={property.photos[0].url}
                                                alt={`Unit ${property.unit_number}`}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                <Building2 className="w-8 h-8 opacity-20" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2">
                                            <Badge variant={getStatusVariant(property.status)} className="capitalize shadow-sm">
                                                {property.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 p-6 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-2xl font-bold">Unit {property.unit_number}</h3>
                                                <div className="text-xl font-bold text-primary">
                                                    {formatCurrency(property.rent)}
                                                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-4">
                                                <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-md">
                                                    <Bed className="w-4 h-4" />
                                                    <span>{property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} Beds`}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-md">
                                                    <Bath className="w-4 h-4" />
                                                    <span>{property.bathrooms} Baths</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-md">
                                                    <Ruler className="w-4 h-4" />
                                                    <span>{formatSqFt(property.square_feet)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex items-center justify-between">
                                            <div className="text-sm text-muted-foreground">
                                                {property.parking_included && (
                                                    <Badge variant="outline" className="mr-2">Parking Included</Badge>
                                                )}
                                                {property.pet_policy && (
                                                    <Badge variant="outline">{property.pet_policy}</Badge>
                                                )}
                                            </div>
                                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
                                                View Details <ArrowRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    </motion.div>
                ))}

                {filteredProperties?.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        No properties found matching your criteria.
                    </div>
                )}
            </div>
        </div>
    );
}
