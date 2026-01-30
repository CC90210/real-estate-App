
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, Home, BedDouble, Bath, Square, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AddPropertyModal } from '@/components/areas/AddPropertyModal';

// Types
type PropertyStatus = 'available' | 'rented' | 'pending' | 'maintenance';

export default async function BuildingDetailsPage({ params }: { params: { areaId: string, buildingId: string } }) {
    const supabase = await createClient();
    const { areaId, buildingId } = await params;

    const { data: building } = await supabase
        .from('buildings')
        .select('*, area:areas(*)')
        .eq('id', buildingId)
        .single();

    const { data: properties } = await supabase
        .from('properties')
        .select('*')
        .eq('building_id', buildingId)
        .order('unit_number', { ascending: true }); // Assuming sort by unit

    if (!building) return <div>Building not found</div>;

    const StatusBadge = ({ status }: { status: PropertyStatus }) => {
        const styles = {
            available: 'bg-green-100 text-green-700 border-green-200',
            pending: 'bg-amber-100 text-amber-700 border-amber-200',
            rented: 'bg-slate-100 text-slate-700 border-slate-200',
            maintenance: 'bg-red-100 text-red-700 border-red-200'
        };
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.rented} uppercase tracking-wide`}>
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <Link href={`/areas/${areaId}`}>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{building.name}</h1>
                    <div className="flex items-center gap-2 text-slate-500 mt-1">
                        <span>{building.address}</span>
                        <span>•</span>
                        <span className="text-blue-600 font-medium">{building.area?.name}</span>
                    </div>
                </div>
                <AddPropertyModal
                    buildingId={buildingId}
                    buildingName={building.name}
                    buildingAddress={building.address}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties?.map((property) => (
                    <Link key={property.id} href={`/properties/${property.id}`}>
                        <div className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer h-full">
                            <div className="h-40 bg-slate-100 relative items-center justify-center flex">
                                {property.photos && property.photos.length > 0 ? (
                                    <img src={property.photos[0]} alt="Property" className="w-full h-full object-cover" />
                                ) : (
                                    <Home className="w-12 h-12 text-slate-300" />
                                )}
                                <div className="absolute top-3 right-3">
                                    <StatusBadge status={property.status} />
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Unit {property.unit_number}</h3>
                                        <p className="text-slate-500 text-sm">
                                            {property.address}
                                        </p>
                                    </div>
                                    <p className="text-xl font-bold text-blue-600">${property.rent.toLocaleString()}</p>
                                </div>

                                <div className="grid grid-cols-3 gap-2 py-3 border-t border-slate-100">
                                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                        <BedDouble className="w-4 h-4 text-slate-400" />
                                        <span>{property.bedrooms} Bed</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                        <Bath className="w-4 h-4 text-slate-400" />
                                        <span>{property.bathrooms} Bath</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                        <Square className="w-4 h-4 text-slate-400" />
                                        <span>{property.square_feet} sqft</span>
                                    </div>
                                </div>

                                {property.available_date && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Available: {new Date(property.available_date) <= new Date() ?
                                            <span className="text-green-600">Now</span> :
                                            new Date(property.available_date).toLocaleDateString()
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
