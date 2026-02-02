import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, Building, MapPin, Check, Plus, Globe, Shield, Trash2, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddBuildingModal } from '@/components/areas/AddBuildingModal';
import { DeleteAreaButton } from '@/components/areas/DeleteAreaButton';
import { cn } from '@/lib/utils';

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

    if (!area) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
            <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                <Globe className="h-8 w-8 text-slate-200" />
            </div>
            <p className="text-slate-500 font-bold">Region not found in tactical records.</p>
            <Button asChild variant="outline">
                <Link href="/areas">Back to Operations</Link>
            </Button>
        </div>
    );

    return (
        <div className="relative p-6 lg:p-10 space-y-10">
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-blue-50/50 rounded-full blur-[100px] -z-10 animate-pulse" />

            {/* Breadcrumbs & Actions Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <Link href="/areas">
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Button>
                    </Link>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-1">
                            <MapPin className="h-3 w-3" />
                            <span>Tactical Geographic Region</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900">{area.name}</h1>
                        <p className="text-slate-500 font-medium max-w-2xl">{area.description || "Active operations area under management."}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <DeleteAreaButton areaId={areaId} areaName={area.name} />
                    <AddBuildingModal areaId={areaId} areaName={area.name} />
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatBox title="Established Assets" value={buildings?.length || 0} icon={Building} label="Buildings" />
                <StatBox title="Total Unit Capacity" value={buildings?.reduce((acc, b) => acc + (b.properties?.length || 0), 0) || 0} icon={Globe} label="Units" />
                <StatBox title="Ready for Lease" value={buildings?.reduce((acc, b) => acc + (b.properties?.filter((p: any) => p.status === 'available').length || 0), 0) || 0} icon={Shield} label="Available" color="emerald" />
            </div>

            {/* Buildings Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Infrastructure</h2>
                    <div className="h-px flex-1 bg-slate-100" />
                </div>

                {buildings && buildings.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {buildings.map((building) => {
                            const unitCount = building.properties?.length || 0;
                            const availableCount = building.properties?.filter((p: any) => p.status === 'available').length || 0;

                            return (
                                <Link key={building.id} href={`/areas/${areaId}/buildings/${building.id}`}>
                                    <div className="group relative bg-white rounded-[2.5rem] p-8 border border-slate-100/60 shadow-lg shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 cursor-pointer flex flex-col md:flex-row gap-8 items-center overflow-hidden">

                                        {/* Hover Effect Background */}
                                        <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="w-full md:w-56 h-40 bg-slate-50 rounded-[2rem] flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
                                            {building.image_url ? (
                                                <img src={building.image_url} className="w-full h-full object-cover rounded-[2rem]" />
                                            ) : (
                                                <Building className="w-16 h-16 text-slate-200 group-hover:text-blue-200 transition-colors" />
                                            )}
                                        </div>

                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors tracking-tight">
                                                    {building.name}
                                                </h3>
                                                <div className="flex items-center text-slate-400 font-bold text-sm">
                                                    <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                                                    {building.address}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {['HVAC', 'Secure Access', 'Parking'].map(a => (
                                                    <Badge key={a} variant="secondary" className="bg-slate-50 text-slate-500 px-4 py-1.5 rounded-xl border border-slate-100 group-hover:border-blue-100 font-bold text-[10px] uppercase tracking-widest">
                                                        <Check className="w-3 h-3 mr-1 text-emerald-500" /> {a}
                                                    </Badge>
                                                ))}
                                                <div className="h-6 w-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-black text-blue-600 ml-2">+2</div>
                                            </div>
                                        </div>

                                        <div className="flex flex-row md:flex-col gap-6 md:items-end w-full md:w-auto pt-6 md:pt-0 md:pl-10 md:border-l border-slate-100">
                                            <div className="text-right flex-1 md:flex-none">
                                                <span className="block text-3xl font-black text-slate-900 leading-none mb-1">{unitCount}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capacity</span>
                                            </div>
                                            <div className="text-right flex-1 md:flex-none">
                                                <span className={cn(
                                                    "block text-3xl font-black leading-none mb-1",
                                                    availableCount > 0 ? "text-emerald-600" : "text-slate-300"
                                                )}>{availableCount}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available</span>
                                            </div>
                                            <div className="hidden md:flex h-10 w-10 rounded-full bg-slate-50 items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white group-hover:translate-x-1 transition-all">
                                                <ArrowUpRight className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                            <Building className="w-8 h-8 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">No infrastructure deployed</h3>
                        <p className="text-slate-500 font-medium max-w-sm mb-6">Establish your first building in this territory to begin unit management.</p>
                        <AddBuildingModal areaId={areaId} areaName={area.name} />
                    </div>
                )}
            </div>
        </div>
    );
}

function StatBox({ title, value, icon: Icon, label, color = "blue" }: any) {
    const colors = {
        blue: "bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-300",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-300",
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 hover:border-indigo-300",
    }
    const c = (colors as any)[color] || colors.blue;

    return (
        <div className={cn("p-6 rounded-[2rem] border transition-all duration-300 bg-white shadow-sm hover:shadow-md", c)}>
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white border border-current flex items-center justify-center shadow-sm">
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">{value}</span>
                        <span className="text-xs font-bold text-slate-400">{label}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
