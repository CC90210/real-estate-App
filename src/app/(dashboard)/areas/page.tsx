
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Building2, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AddAreaModal } from '@/components/areas/AddAreaModal';

export default async function AreasPage() {
    const supabase = await createClient();

    const { data: areas, error } = await supabase
        .from('areas')
        .select(`
            *,
            buildings (
                id,
                properties (id, status)
            )
        `)
        .order('name');

    if (error) {
        return <div className="p-8 text-red-500 bg-red-50 rounded-lg">Error loading areas: {error.message}</div>;
    }

    if (!areas || areas.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <MapPin className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No Areas Found</h3>
                <p className="text-slate-500 max-w-sm mt-2">There are no areas defined in the database yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Areas</h1>
                    <p className="text-slate-500 mt-2">Manage your properties by geographic location.</p>
                </div>
                <AddAreaModal />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {areas.map((area) => { // Removed simplistic type mapping to avoid errors
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
        </div>
    );
}
