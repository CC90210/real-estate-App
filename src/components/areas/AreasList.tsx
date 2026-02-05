'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Building2, Search, MapPin, ArrowRight, Home, TrendingUp, Sparkles, LayoutGrid, MoreVertical, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditAreaModal } from './EditAreaModal';
import { Skeleton } from '@/components/ui/skeleton';

const AreasMap = dynamic(() => import('./AreasMap'), {
    ssr: false,
    loading: () => <Skeleton className="h-[600px] w-full rounded-[2.5rem] bg-slate-100" />
});

export function AreasList({ initialAreas }: { initialAreas: any[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [editingArea, setEditingArea] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
    const { colors } = useAccentColor();

    const filteredAreas = initialAreas.filter(area =>
        area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        area.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-10">
            {/* Search and Filters Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="relative max-w-md w-full group">
                    <div className={cn("absolute inset-0 rounded-2xl blur-xl transition-colors", colors.bgLight, "opacity-0 group-hover:opacity-100")} />
                    <div className="relative flex items-center">
                        <Search className={cn("absolute left-4 w-5 h-5 text-slate-400 transition-colors", `group-hover:${colors.text}`)} />
                        <Input
                            placeholder="Search regions, neighborhoods..."
                            className={cn("pl-12 h-14 bg-white border-slate-200/60 rounded-2xl shadow-sm transition-all text-base font-medium", colors.focusRing, `border-transparent hover:border-slate-300 focus:${colors.border.replace('border-', '')}`)}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? `bg-white shadow-sm ${colors.text}` : "text-slate-400 hover:text-slate-600")}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'map' ? `bg-white shadow-sm ${colors.text}` : "text-slate-400 hover:text-slate-600")}
                        >
                            <MapPin className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {filteredAreas.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center bg-white/50 backdrop-blur-md rounded-[2.5rem] border-2 border-dashed border-slate-200/60 transition-all animate-in fade-in zoom-in duration-500">
                    <div className={cn("w-24 h-24 rounded-[2rem] flex items-center justify-center mb-6 animate-pulse-soft", colors.bgLight)}>
                        <MapPin className={cn("w-10 h-10 opacity-30", colors.text)} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">No areas found</h3>
                    <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
                        We couldn't find any regions matching your search query. Try a different keyword or create a new area.
                    </p>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {filteredAreas.map((area, idx) => {
                                const buildingCount = area.buildings?.length || 0;
                                const availableCount = area.buildings?.reduce((acc: number, b: any) => {
                                    return acc + (b.properties?.filter((p: any) => p.status === 'available').length || 0);
                                }, 0) || 0;

                                return (
                                    <Link key={area.id} href={`/areas/${area.id}`} className="block group relative">
                                        <div className={cn("relative bg-white rounded-[2.5rem] p-0 shadow-lg shadow-slate-200/50 transition-all duration-500 border border-slate-100/60 hover:-translate-y-2 overflow-hidden h-full flex flex-col", colors.shadowHover)}>

                                            {/* Top Graphic */}
                                            <div className="relative h-48 overflow-hidden">
                                                {area.image_url ? (
                                                    <img
                                                        src={area.image_url}
                                                        alt={area.name}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <div className={cn("w-full h-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br", colors.gradient)}>
                                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                                        <MapPin className="w-16 h-16 text-white/20 relative z-10" />
                                                    </div>
                                                )}

                                                {/* Overlay Tags */}
                                                <div className="absolute top-4 left-4 flex gap-2">
                                                    <div className={cn("px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md text-[10px] font-black uppercase tracking-widest shadow-lg", colors.text)}>
                                                        Region #{idx + 1}
                                                    </div>
                                                </div>

                                                {/* Edit Action Menu */}
                                                <div className="absolute top-4 right-4 z-20" onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button
                                                                className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                                            >
                                                                <MoreVertical className="h-4 w-4 text-slate-600" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40">
                                                            <DropdownMenuItem onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingArea(area);
                                                            }}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                <span>Edit Area</span>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>

                                                <div className="absolute bottom-4 right-4 animate-float">
                                                    <div className="h-12 w-12 rounded-2xl bg-white shadow-xl flex items-center justify-center">
                                                        <TrendingUp className={cn("h-6 w-6", colors.text)} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-8 flex-1 flex flex-col">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div>
                                                        <h3 className={cn("text-2xl font-black text-slate-900 transition-colors tracking-tight", `group-hover:${colors.text}`)}>
                                                            {area.name}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Sparkles className={cn("h-3 w-3", colors.text)} />
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Territory</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed line-clamp-2">
                                                    {area.description || "Deploy strategy and management protocols for this tactical geographic region."}
                                                </p>

                                                <div className="grid grid-cols-2 gap-4 mt-auto">
                                                    <div className={cn("p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-colors", `group-hover:${colors.bgLight}/50`, `group-hover:${colors.border}`)}>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Building2 className={cn("w-4 h-4", colors.text)} />
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Buildings</span>
                                                        </div>
                                                        <span className="text-lg font-black text-slate-900">{buildingCount}</span>
                                                    </div>
                                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 group-hover:bg-emerald-50/50 group-hover:border-emerald-100 transition-colors">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Home className="w-4 h-4 text-emerald-500" />
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Units</span>
                                                        </div>
                                                        <span className="text-lg font-black text-emerald-600">{availableCount} Available</span>
                                                    </div>
                                                </div>

                                                <div className={cn("mt-8 pt-6 border-t border-slate-50 flex items-center justify-between transition-colors", `group-hover:${colors.border}`)}>
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Open Analytics</span>
                                                    <div className={cn("h-10 w-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center group-hover:rotate-45 transition-all duration-500 text-white", `group-hover:${colors.bg}`)}>
                                                        <ArrowRight className="h-5 w-5" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="animate-in fade-in zoom-in duration-500">
                            <AreasMap areas={filteredAreas} />
                        </div>
                    )}
                </>
            )}

            <EditAreaModal
                area={editingArea}
                open={!!editingArea}
                onOpenChange={(open) => !open && setEditingArea(null)}
            />
        </div>
    );
}
