'use client';

import { useLandlords } from '@/lib/hooks/useProperties';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Phone, MapPin, Building, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function LandlordsPage() {
    const { data: landlords, isLoading } = useLandlords();

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Landlords</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage property owners and their portfolios.
                    </p>
                </div>
                <Button className="gradient-bg text-white shadow-lg shadow-primary/20 gap-2">
                    <Plus className="w-4 h-4" />
                    Add Landlord
                </Button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-48 rounded-xl" />
                    ))
                ) : (
                    landlords?.map((landlord, index) => (
                        <motion.div
                            key={landlord.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Link href={`/landlords/${landlord.id}`}>
                                <Card className="card-hover border-none shadow-sm h-full group">
                                    <div className="h-2 bg-gradient-to-r from-primary to-accent rounded-t-xl opacity-80" />
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                        {landlord.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-bold text-lg">{landlord.name}</h3>
                                                    {landlord.company_name && (
                                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                            <Building className="w-3 h-3" />
                                                            {landlord.company_name}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-sm">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                                    <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{landlord.properties_count}</p>
                                                    <p className="text-xs text-muted-foreground">Properties</p>
                                                </div>
                                            </div>

                                            <div className="h-px bg-border my-2" />

                                            <div className="space-y-2 text-sm text-muted-foreground">
                                                {landlord.email && (
                                                    <div className="flex items-center gap-2 hover:text-primary transition-colors">
                                                        <Mail className="w-4 h-4" />
                                                        {landlord.email}
                                                    </div>
                                                )}
                                                {landlord.phone && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-4 h-4" />
                                                        {landlord.phone}
                                                    </div>
                                                )}
                                                {landlord.address && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4" />
                                                        <span className="truncate">{landlord.address}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-6 flex items-center justify-between text-sm font-medium text-primary group-hover:underline">
                                            View Details
                                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
