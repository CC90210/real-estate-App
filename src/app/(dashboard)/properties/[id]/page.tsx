
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, Home, BedDouble, Bath, Square, Calendar, MapPin, Key, Shield, Info, Edit, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GenerateAdButton } from '@/components/properties/GenerateAdButton';
import { EditPropertyModal } from '@/components/properties/EditPropertyModal';
// We need client component for interactivity (modal trigger)

export default async function PropertyDetailsPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { id } = await params;

    const { data: property } = await supabase
        .from('properties')
        .select(`
            *,
            buildings (
                *,
                area:areas(*)
            )
        `)
        .eq('id', id)
        .single();

    if (!property) return <div className="p-8">Property not found</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center gap-4">
                <Link href={`/areas/${property.buildings?.area_id}/buildings/${property.building_id}`}>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{property.address}</h1>
                    <div className="flex items-center gap-2 text-slate-500 mt-1">
                        <MapPin className="w-4 h-4" />
                        <span>{property.buildings?.name}</span>
                        <span>•</span>
                        <span className="text-blue-600 font-medium">{property.buildings?.area?.name}</span>
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    <EditPropertyModal property={property} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Image / Stats */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="h-64 sm:h-80 bg-slate-100 relative flex items-center justify-center">
                            {property.photos && property.photos.length > 0 ? (
                                <img src={property.photos[0]} className="w-full h-full object-cover" alt="Property" />
                            ) : (
                                <div className="flex flex-col items-center gap-4 text-slate-400">
                                    <Home className="w-16 h-16" />
                                    <span>No photos available</span>
                                </div>
                            )}
                            <div className="absolute top-4 right-4">
                                <Badge className="bg-white/90 text-slate-900 backdrop-blur-md shadow-sm hover:bg-white text-sm py-1 px-3">
                                    {property.status}
                                </Badge>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-3 gap-4 border-b border-slate-100">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-slate-900">{property.bedrooms}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Bedrooms</div>
                            </div>
                            <div className="text-center border-l border-r border-slate-100">
                                <div className="text-2xl font-bold text-slate-900">{property.bathrooms}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Bathrooms</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-slate-900">{property.square_feet}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Sq Ft</div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Info className="w-5 h-5 text-blue-500" /> Description
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            {property.description || "No description provided for this unit."}
                        </p>
                        <Separator className="my-6" />
                        <h3 className="font-semibold text-slate-900 mb-3">Amenities</h3>
                        <div className="flex flex-wrap gap-2">
                            {/* Mock amenities if not in properties table, or assuming property.amenities exists */}
                            {property.amenities?.map((a: string) => (
                                <Badge key={a} variant="secondary" className="px-3 py-1 bg-slate-100 text-slate-700 font-normal">
                                    {a}
                                </Badge>
                            )) || ["No specific unit amenities listed"].map(a => <span key={a} className="text-slate-500 italic text-sm">{a}</span>)}
                        </div>
                    </div>
                </div>

                {/* Sidebar Details */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-1">Monthly Rent</div>
                        <div className="text-4xl font-bold text-blue-600 mb-6">
                            ${property.rent.toLocaleString()}
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between py-2 border-b border-slate-50">
                                <span className="text-slate-600">Status</span>
                                <span className="font-medium capitalize">{property.status}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-50">
                                <span className="text-slate-600">Available</span>
                                <span className="font-medium">{new Date(property.available_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-50">
                                <span className="text-slate-600">Deposit</span>
                                <span className="font-medium">${property.deposit?.toLocaleString() || property.rent.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg p-6 text-white">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-5 h-5 text-amber-400" />
                            <h3 className="font-bold">Agent Access</h3>
                        </div>
                        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/10">
                            <div className="text-xs text-slate-300 uppercase tracking-wide mb-1">Lockbox Code</div>
                            <div className="text-3xl font-mono font-bold tracking-widest text-amber-400">
                                {property.lockbox_code || "N/A"}
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                            This code is strictly for authorized agents and maintenance personnel. Do not share with applicants.
                        </p>
                    </div>
                </div>
            </div>

            {/* Floating Actions */}
            <GenerateAdButton propertyId={property.id} />
        </div>
    );
}
