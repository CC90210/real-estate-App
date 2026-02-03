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
import { Search, Filter, BedDouble, Bath, Plus, MapPin, User, ArrowRight, Building2, Home, TrendingUp, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { cn } from '@/lib/utils';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { PropertyImport } from '@/components/properties/PropertyImport';
import { Upload } from 'lucide-react';

export default function PropertiesPage() {
    const { data: properties, isLoading, error } = useProperties();
    const { data: landlords } = useLandlords();
    const router = useRouter();
    const { colors } = useAccentColor();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [bedsFilter, setBedsFilter] = useState('all');
    const [priceSort, setPriceSort] = useState('default');
    const [importDialogOpen, setImportDialogOpen] = useState(false);

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
        return 0;
    });

    const getLandlordName = (id: string | null) => {
        if (!id) return 'Unknown';
        return landlords?.find(l => l.id === id)?.name || 'Unknown';
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles = {
            available: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            pending: 'bg-amber-50 text-amber-600 border-amber-100',
            rented: 'bg-blue-50 text-blue-600 border-blue-100',
            off_market: 'bg-slate-50 text-slate-500 border-slate-100',
            maintenance: 'bg-rose-50 text-rose-600 border-rose-100',
        };
        // @ts-ignore
        const style = styles[status] || styles.off_market;
        return (
            <Badge variant="outline" className={cn("capitalize font-black text-[10px] tracking-widest rounded-xl px-3 py-1 bg-white/90 backdrop-blur-md shadow-sm", style)}>
                {status.replace('_', ' ')}
            </Badge>
        );
    };

    if (isLoading) {
        return (
            <div className="p-10 space-y-10">
                <div className="flex justify-between items-center">
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-48 rounded-xl" />
                        <Skeleton className="h-4 w-96 rounded-lg" />
                    </div>
                    <Skeleton className="h-14 w-40 rounded-2xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[400px] w-full rounded-[2.5rem]" />
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-10">
                <ErrorState
                    title="Failed to load portfolio"
                    message={(error as Error).message}
                    onRetry={() => window.location.reload()}
                    className="mx-auto max-w-lg"
                />
            </div>
        )
    }

    return (
        <div className="relative p-6 lg:p-10 space-y-10">
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-blue-50/50 rounded-full blur-[120px] -z-10 animate-pulse-soft" />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-1">
                        <Home className="h-3 w-3" />
                        <span>Asset Management</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Infrastructure</h1>
                    <p className="text-slate-500 font-medium">
                        Strategic oversight of your property portfolio ({filteredProperties?.length || 0} units)
                    </p>
                </div>
                <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right duration-700">
                    <Button
                        onClick={() => setImportDialogOpen(true)}
                        className={cn("h-14 px-8 rounded-2xl text-white font-bold shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl border-0", colors.bg, `hover:${colors.bgHover}`, colors.shadow)}
                    >
                        <Upload className="w-5 h-5 mr-3" />
                        Tactical Import
                    </Button>
                    <Button asChild className={cn("h-14 px-8 rounded-2xl text-white font-bold shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl border-0", colors.bg, `hover:${colors.bgHover}`, colors.shadow)}>
                        <Link href="/properties/new">
                            <Plus className="h-5 w-5 mr-3" /> Register Asset
                        </Link>
                    </Button>
                </div>
            </div>
            <PropertyImport open={importDialogOpen} onOpenChange={setImportDialogOpen} />

            {/* Filters */}
            <Card className="bg-white/80 backdrop-blur-xl border-slate-100 rounded-[2rem] shadow-xl shadow-slate-200/50 p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                            placeholder="Search coordinates..."
                            className="h-12 pl-12 bg-slate-50 border-transparent focus:bg-white focus:border-blue-400 transition-all rounded-xl font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-12 bg-slate-50 border-transparent text-slate-600 font-bold rounded-xl">
                            <Filter className="w-4 h-4 mr-2 opacity-50" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="rented">Rented</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={bedsFilter} onValueChange={setBedsFilter}>
                        <SelectTrigger className="h-12 bg-slate-50 border-transparent text-slate-600 font-bold rounded-xl">
                            <BedDouble className="w-4 h-4 mr-2 opacity-50" />
                            <SelectValue placeholder="Format" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                            <SelectItem value="all">Any Capacity</SelectItem>
                            <SelectItem value="1">1 Bedroom</SelectItem>
                            <SelectItem value="2">2 Bedrooms</SelectItem>
                            <SelectItem value="3+">3+ Bedrooms</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={priceSort} onValueChange={setPriceSort}>
                        <SelectTrigger className="h-12 bg-slate-50 border-transparent text-slate-600 font-bold rounded-xl">
                            <TrendingUp className="w-4 h-4 mr-2 opacity-50" />
                            <SelectValue placeholder="Financials" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                            <SelectItem value="default">Default Analytics</SelectItem>
                            <SelectItem value="asc">Yield: Low to High</SelectItem>
                            <SelectItem value="desc">Yield: High to Low</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProperties && filteredProperties.length === 0 ? (
                    <div className="col-span-full py-20 bg-white/50 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                            <Search className="w-8 h-8 text-slate-200" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900">No records matching query</h3>
                        <p className="text-slate-500 font-medium mt-2">Adjust your tactical parameters and try again.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {filteredProperties?.map((property, index) => (
                            <motion.div
                                key={property.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                            >
                                <Link href={`/properties/${property.id}`} className="group block">
                                    <Card className={cn("relative bg-white rounded-[2.5rem] border-slate-100/60 shadow-lg shadow-slate-200/50 transition-all duration-500 overflow-hidden h-full flex flex-col hover:-translate-y-2 hover:shadow-xl", `hover:shadow-${colors.primary}/10`)}>

                                        <div className="relative h-56 bg-slate-100 overflow-hidden">
                                            {property.photos?.[0] ? (
                                                <img
                                                    src={property.photos[0]}
                                                    alt={property.address}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                                                    <Building2 className="w-16 h-16 text-slate-300 transition-transform group-hover:scale-110" />
                                                </div>
                                            )}

                                            <div className="absolute top-4 right-4 z-10">
                                                <StatusBadge status={property.status} />
                                            </div>

                                            <div className="absolute top-4 left-4">
                                                <div className="px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md text-[10px] font-black text-white uppercase tracking-widest shadow-lg">
                                                    ID: {property.id.slice(0, 5)}
                                                </div>
                                            </div>

                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>

                                        <CardContent className="p-8 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="space-y-1">
                                                    <h3 className={cn("font-black text-xl text-slate-900 transition-colors tracking-tight line-clamp-1", `group-hover:${colors.text}`)}>
                                                        {property.address}
                                                    </h3>
                                                    <div className="flex items-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                                        <MapPin className={cn("w-3 h-3 mr-1.5", colors.text)} />
                                                        {property.city}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-baseline gap-1 mb-8">
                                                <span className="text-3xl font-black text-slate-900">${property.rent.toLocaleString()}</span>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">/ Month</span>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4 py-6 border-t border-slate-50">
                                                <div className="flex flex-col items-center">
                                                    <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-blue-50 transition-colors">
                                                        <BedDouble className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                                                    </div>
                                                    <span className="text-sm font-black text-slate-900">{property.bedrooms}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Beds</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-emerald-50 transition-colors">
                                                        <Bath className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                                                    </div>
                                                    <span className="text-sm font-black text-slate-900">{property.bathrooms}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Baths</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-indigo-50 transition-colors">
                                                        <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                                                    </div>
                                                    <span className="text-sm font-black text-slate-900">{property.square_feet || '-'}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sq Ft</span>
                                                </div>
                                            </div>

                                            <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                        <User className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                    <span className="text-xs font-black text-slate-600 truncate max-w-[120px]">
                                                        {getLandlordName(property.landlord_id)}
                                                    </span>
                                                </div>
                                                <div className={cn("h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 transition-all text-white", `group-hover:${colors.bg}`)}>
                                                    <ArrowRight className="w-5 h-5" />
                                                </div>
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
