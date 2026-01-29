'use client';

import { motion } from 'framer-motion';
import { useArea, useBuildings } from '@/lib/hooks/useProperties';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Search, ArrowLeft, Home, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function BuildingsPage() {
    const params = useParams();
    const router = useRouter();
    const areaId = params.areaId as string;
    const { data: area, isLoading: areaLoading } = useArea(areaId);
    const { data: buildings, isLoading: buildingsLoading } = useBuildings(areaId);
    const [search, setSearch] = useState('');
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);

    // Filter buildings
    const filteredBuildings = buildings?.filter((building) => {
        const matchesSearch = building.name.toLowerCase().includes(search.toLowerCase()) ||
            building.address.toLowerCase().includes(search.toLowerCase());
        const matchesAvailability = showAvailableOnly ? (building.available_units_count || 0) > 0 : true;

        return matchesSearch && matchesAvailability;
    });

    if (areaLoading || buildingsLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-1/3 bg-muted rounded animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-48 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!area) return <div>Area not found</div>;

    return (
        <div className="space-y-6">
            {/* Breadcrumb & Header */}
            <div>
                <Button
                    variant="ghost"
                    className="pl-0 gap-2 mb-2 text-muted-foreground hover:text-foreground"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Areas
                </Button>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{area.name}</h1>
                        <p className="text-muted-foreground mt-1">
                            {buildings?.length} buildings in this area
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search buildings..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Switch
                        id="available-filter"
                        checked={showAvailableOnly}
                        onCheckedChange={setShowAvailableOnly}
                    />
                    <Label htmlFor="available-filter">Available Units Only</Label>
                </div>
            </div>

            {/* Buildings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBuildings?.map((building, index) => (
                    <motion.div
                        key={building.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Link href={`/areas/${areaId}/buildings/${building.id}`}>
                            <Card className="card-hover h-full cursor-pointer border-0 shadow-sm bg-card">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-primary">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        {building.available_units_count ? (
                                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                                {building.available_units_count} Units Available
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">Full</Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl">{building.name}</CardTitle>
                                    <CardDescription className="line-clamp-1">
                                        {building.address}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {building.amenities?.slice(0, 3).map((amenity) => (
                                            <Badge key={amenity} variant="outline" className="text-xs font-normal">
                                                {amenity}
                                            </Badge>
                                        ))}
                                        {(building.amenities?.length || 0) > 3 && (
                                            <Badge variant="outline" className="text-xs font-normal">
                                                +{(building.amenities?.length || 0) - 3} more
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
                                        <div className="flex items-center gap-1">
                                            <Home className="w-4 h-4" />
                                            <span>{building.total_units} Total Units</span>
                                        </div>
                                        {building.year_built && (
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                <span>Built {building.year_built}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    </motion.div>
                ))}

                {filteredBuildings?.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No buildings found matching your criteria.
                    </div>
                )}
            </div>
        </div>
    );
}
