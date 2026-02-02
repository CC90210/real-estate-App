'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Search, MapPin, ArrowRight, Home, TrendingUp, Sparkles, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function AreasList({ initialAreas }: { initialAreas: any[] }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredAreas = initialAreas.filter(area =>
        area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        area.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-10">
            {/* Search and Filters Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="relative max-w-md w-full group">
                    <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-xl group-hover:bg-blue-500/10 transition-colors" />
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <Input
                            placeholder="Search regions, neighborhoods..."
                            className="pl-12 h-14 bg-white border-slate-200/60 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 transition-all text-base font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button className="p-2 rounded-lg bg-white shadow-sm text-blue-600">
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600">
                            <MapPin className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {filteredAreas.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center bg-white/50 backdrop-blur-md rounded-[2.5rem] border-2 border-dashed border-slate-200/60 transition-all animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center mb-6 animate-pulse-soft">
                        <MapPin className="w-10 h-10 text-blue-200" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">No areas found</h3>
                    <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
                        We couldn't find any regions matching your search query. Try a different keyword or create a new area.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredAreas.map((area, idx) => {
                        const buildingCount = area.buildings?.length || 0;
                        const availableCount = area.buildings?.reduce((acc: number, b: any) => {
                            return acc + (b.properties?.filter((p: any) => p.status === 'available').length || 0);
                        }, 0) || 0;

                        return (
                            <Link key={area.id} href={`/areas/${area.id}`} className="block group">
                                <div className="relative bg-white rounded-[2.5rem] p-0 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 border border-slate-100/60 hover:-translate-y-2 overflow-hidden h-full flex flex-col">

                                    {/* Top Graphic */}
                                    <div className="relative h-48 overflow-hidden">
                                        {area.image_url ? (
                                            <img
                                                src={area.image_url}
                                                alt={area.name}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center relative overflow-hidden">
                                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                                <MapPin className="w-16 h-16 text-white/20 relative z-10" />
                                            </div>
                                        )}

                                        {/* Overlay Tags */}
                                        <div className="absolute top-4 left-4 flex gap-2">
                                            <div className="px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md text-[10px] font-black text-blue-600 uppercase tracking-widest shadow-lg">
                                                Region #{idx + 1}
                                            </div>
                                        </div>

                                        <div className="absolute bottom-4 right-4 animate-float">
                                            <div className="h-12 w-12 rounded-2xl bg-white shadow-xl flex items-center justify-center">
                                                <TrendingUp className="h-6 w-6 text-blue-600" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 flex-1 flex flex-col">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">
                                                    {area.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Sparkles className="h-3 w-3 text-blue-500" />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Territory</span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed line-clamp-2">
                                            {area.description || "Deploy strategy and management protocols for this tactical geographic region."}
                                        </p>

                                        <div className="grid grid-cols-2 gap-4 mt-auto">
                                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 group-hover:bg-blue-50/50 group-hover:border-blue-100 transition-colors">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Building2 className="w-4 h-4 text-blue-500" />
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

                                        <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between group-hover:border-blue-50 transition-colors">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Open Analytics</span>
                                            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-45 transition-all duration-500">
                                                <ArrowRight className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
