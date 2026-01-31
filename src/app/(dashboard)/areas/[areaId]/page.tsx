
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, Building, MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddBuildingModal } from '@/components/areas/AddBuildingModal';
import { DeleteAreaButton } from '@/components/areas/DeleteAreaButton';

export default async function AreaDetailsPage({ params }: { params: { areaId: string } }) {
    const supabase = await createClient();
    const { areaId } = await params;

    // Fetch Area Details
    const { data: area } = await supabase
        .from('areas')
        .select('*')
        .eq('id', areaId)
        .single();

    // Fetch Buildings with property counts
    const { data: buildings } = await supabase
        .from('buildings')
        .select(`
            *,
            properties (id, status)
        `)
        .eq('area_id', areaId);

    if (!area) return <div className="p-8 text-center">Area not found.</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <Link href="/areas">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{area.name}</h1>
                    <p className="text-slate-500 mt-1 max-w-2xl">{area.description}</p>
                </div>
                <div className="flex items-center gap-2">
                    <DeleteAreaButton areaId={areaId} areaName={area.name} />
                    <AddBuildingModal areaId={areaId} areaName={area.name} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {buildings?.map((building) => {
                    const unitCount = building.properties?.length || 0;
                    const availableCount = building.properties?.filter((p: any) => p.status === 'available').length || 0;

                    return (
                        <Link key={building.id} href={`/areas/${areaId}/buildings/${building.id}`}>
                            <div className="group bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer flex flex-col md:flex-row gap-6 items-start md:items-center">
                                <div className="w-full md:w-48 h-32 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                                    <Building className="w-12 h-12 text-slate-300" />
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                                            {building.name}
                                        </h3>
                                        <div className="flex items-center text-slate-500 text-sm">
                                            <MapPin className="w-4 h-4 mr-1" />
                                            {building.address}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {/* Mock amenities if not in DB, assuming DB schema might vary */}
                                        {['Gym', 'Pool', 'Parking'].map(a => (
                                            <Badge key={a} variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-normal">
                                                <Check className="w-3 h-3 mr-1" /> {a}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-row md:flex-col gap-4 md:items-end w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                                    <div className="text-center">
                                        <span className="block text-2xl font-bold text-slate-900">{unitCount}</span>
                                        <span className="text-xs text-slate-500 uppercase tracking-wide">Units</span>
                                    </div>
                                    <div className="text-center">
                                        <span className={`block text-2xl font-bold ${availableCount > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                            {availableCount}
                                        </span>
                                        <span className="text-xs text-slate-500 uppercase tracking-wide">Available</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    );
}
