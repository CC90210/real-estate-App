'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function AreasList({ initialAreas }: { initialAreas: any[] }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredAreas = initialAreas.filter(area =>
        area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        area.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="Search areas..."
                    className="pl-10 bg-white border-slate-200 shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {filteredAreas.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <MapPin className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">No areas matching your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAreas.map((area) => {
                        const buildingCount = area.buildings?.length || 0;
                        const availableCount = area.buildings?.reduce((acc: number, b: any) => {
                            return acc + (b.properties?.filter((p: any) => p.status === 'available').length || 0);
                        }, 0) || 0;

                        return (
                            <Link key={area.id} href={`/areas/${area.id}`}>
                                <div className="group bg-white rounded-xl shadow-sm border border-slate-200 p-0 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer h-full flex flex-col overflow-hidden">
                                    <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500 w-full" />
                                    <div className="p-6 flex-1 flex flex-col">
                                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                                            {area.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 mb-6 line-clamp-3 flex-1">
                                            {area.description || "No description provided."}
                                        </p>

                                        <div className="flex items-center justify-between text-sm pt-4 border-t border-slate-100">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Building2 className="w-4 h-4" />
                                                <span>{buildingCount} Buildings</span>
                                            </div>
                                            <div className={`font-medium ${availableCount > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                                {availableCount} Available
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
