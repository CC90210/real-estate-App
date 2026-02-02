'use client';

import { useState } from 'react';
import { useProperties } from '@/lib/hooks/useProperties';
import { useLandlords } from '@/lib/hooks/useProperties';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, BedDouble, Bath, Plus, MapPin, User, ArrowRight, Building2, Home } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Property, Landlord } from '@/types/database';

import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

export default function PropertiesPage() {
    const { data: properties, isLoading, error } = useProperties();
    const { data: landlords } = useLandlords();
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [bedsFilter, setBedsFilter] = useState('all');
    const [priceSort, setPriceSort] = useState('default');

    // Filter Logic
    const filteredProperties = properties?.filter(property => {
        const matchesSearch =
            property.address.toLowerCase().includes(search.toLowerCase()) ||
            property.neighborhood?.toLowerCase().includes(search.toLowerCase()) ||
            property.city.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === 'all' || property.status === statusFilter;

        const matchesBeds = bedsFilter === 'all' ||
            (bedsFilter === '3+' ? property.bedrooms >= 3 : property.bedrooms === parseInt(bedsFilter));

        return matchesSearch && matchesStatus && matchesBeds;
    }).sort((a, b) => {
        if (priceSort === 'asc') return a.rent - b.rent;
        if (priceSort === 'desc') return b.rent - a.rent;
        return 0; // default (updated_at usually)
    });

    const getLandlordName = (id: string | null) => {
        if (!id) return 'Unknown';
        return landlords?.find(l => l.id === id)?.name || 'Unknown';
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles = {
            available: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
            pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
            rented: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
            off_market: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            maintenance: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        // @ts-ignore
        const style = styles[status] || styles.off_market;
        return (
            <Badge variant="outline" className={`${style} capitalize font-medium rounded-full px-3 py-0.5`}>
                {status.replace('_', ' ')}
            </Badge>
        );
    };

    // 1. Loading State
    if (isLoading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <Skeleton className="h-20 w-full rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-48 w-full rounded-xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // 2. Error State
    if (error) {
        return (
            <ErrorState
                title="Failed to load properties"
                message={(error as Error).message}
                onRetry={() => window.location.reload()}
                className="mt-12 mx-auto max-w-lg"
            />
        )
    }

    // 3. Empty State (No properties at all)
    if (!properties || properties.length === 0) {
        return (
            <EmptyState
                icon={Home}
                title="No properties yet"
                description="Add your first property to start managing your portfolio."
                action={
                    <Button onClick={() => router.push('/areas')} className="gap-2">
                        <Plus className="w-4 h-4" /> Add Property
                    </Button>
                }
                className="mt-12 mx-auto max-w-lg"
            />
        )
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your property portfolio ({filteredProperties?.length || 0})
                    </p>
                </div>
                <Link href="/areas">
                    <Button className="gradient-bg text-white shadow-lg shadow-primary/20 gap-2">
                        <Plus className="w-4 h-4" />
                        Add Unit (via Areas)
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <Card className="border-none shadow-sm p-4 bg-muted/40">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search address, neighborhood..."
                            className="pl-9 bg-background border-none shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-background border-none shadow-sm">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="rented">Rented</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={bedsFilter} onValueChange={setBedsFilter}>
                        <SelectTrigger className="bg-background border-none shadow-sm">
                            <SelectValue placeholder="Bedrooms" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Any Bedrooms</SelectItem>
                            <SelectItem value="1">1 Bedroom</SelectItem>
                            <SelectItem value="2">2 Bedrooms</SelectItem>
                            <SelectItem value="3+">3+ Bedrooms</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={priceSort} onValueChange={setPriceSort}>
                        <SelectTrigger className="bg-background border-none shadow-sm">
                            <SelectValue placeholder="Price" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default">Sort by: Default</SelectItem>
                            <SelectItem value="asc">Price: Low to High</SelectItem>
                            <SelectItem value="desc">Price: High to Low</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties && filteredProperties.length === 0 ? (
                    <div className="col-span-full py-12">
                        <EmptyState
                            title="No properties found"
                            description="Try adjusting your filters or search terms."
                            className="bg-transparent border-none shadow-none"
                        />
                    </div>
                ) : (
                    <AnimatePresence>
                        {filteredProperties?.map((property, index) => (
                            <motion.div
                                key={property.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                            >
                                <Link href={`/properties/${property.id}`}>
                                    <Card className="card-hover border-none shadow-sm overflow-hidden group h-full flex flex-col">
                                        <div className="relative h-48 bg-muted overflow-hidden">
                                            {property.photos?.[0] ? (
                                                <img
                                                    src={property.photos[0]}
                                                    alt={property.address}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-muted-foreground">
                                                    <Building2 className="w-10 h-10 opacity-20" />
                                                </div>
                                            )}
                                            <div className="absolute top-3 right-3">
                                                <StatusBadge status={property.status} />
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-xs font-medium flex items-center gap-1">
                                                    View Details <ArrowRight className="w-3 h-3" />
                                                </p>
                                            </div>
                                        </div>
                                        <CardContent className="p-5 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-semibold text-lg line-clamp-1">{property.address}</h3>
                                                <p className="font-bold text-lg text-primary">
                                                    ${property.rent.toLocaleString()}
                                                </p>
                                            </div>

                                            <div className="text-sm text-muted-foreground mb-4 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {property.neighborhood ? `${property.neighborhood}, ${property.city}` : property.city}
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-dashed border-gray-100 dark:border-gray-800 mb-4">
                                                <div className="flex flex-col items-center justify-center text-center">
                                                    <span className="text-sm font-semibold">{property.bedrooms}</span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <BedDouble className="w-3 h-3" /> Beds
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center text-center border-l border-r border-gray-100 dark:border-gray-800">
                                                    <span className="text-sm font-semibold">{property.bathrooms}</span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Bath className="w-3 h-3" /> Baths
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center text-center">
                                                    <span className="text-sm font-semibold">{property.square_feet || '-'}</span>
                                                    <span className="text-xs text-muted-foreground">Sq Ft</span>
                                                </div>
                                            </div>

                                            <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                                                    <User className="w-3 h-3" />
                                                    {getLandlordName(property.landlord_id)}
                                                </span>
                                                {property.available_date && (
                                                    <span className={property.status === 'available' ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                                                        {new Date(property.available_date) <= new Date() ? 'Available Now' : `Avail: ${new Date(property.available_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                                                    </span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
