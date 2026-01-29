'use client';

import { motion } from 'framer-motion';
import { useAreas } from '@/lib/hooks/useProperties';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Search, MapPin, Home } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

export default function AreasPage() {
    const { data: areas, isLoading } = useAreas();
    const [search, setSearch] = useState('');

    const filteredAreas = areas?.filter((area) =>
        area.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Areas</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage properties across different neighborhoods.
                    </p>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search areas..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 max-w-sm"
                />
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className="h-48 rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAreas?.map((area, index) => (
                        <motion.div
                            key={area.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Link href={`/areas/${area.id}`}>
                                <Card className="card-hover h-full cursor-pointer group border-0 shadow-sm bg-card overflow-hidden">
                                    <div className="h-2 bg-gradient-to-r from-primary to-accent" />
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <Badge variant="secondary" className="font-normal">
                                                {area.available_properties_count} Available
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-xl">{area.name}</CardTitle>
                                        <CardDescription className="line-clamp-2">
                                            {area.description || "No description available."}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Building2 className="w-4 h-4" />
                                                <span>{area.building_count} Buildings</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}

                    {filteredAreas?.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No areas found matching your search.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
