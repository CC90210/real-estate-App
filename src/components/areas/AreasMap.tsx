'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { geocodeLocation } from '@/lib/utils/geocoding';
import L from 'leaflet';
import Link from 'next/link';
import { Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

// Fix for default Leaflet markers in Next.js
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface AreasMapProps {
    areas: any[];
}

interface GeocodedArea {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    buildings?: any[];
    lat: number;
    lon: number;
}

export default function AreasMap({ areas }: AreasMapProps) {
    const [geocodedAreas, setGeocodedAreas] = useState<GeocodedArea[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const processAreas = async () => {
            setLoading(true);
            const processed: GeocodedArea[] = [];

            // Limit concurrent requests to avoid spamming the free API
            for (const area of areas) {
                // If the area name itself is a location, or we could look for a 'location' field if it existed.
                // Assuming area.name is the location key for now, e.g. "Montreal West"

                // Skip if no name
                if (!area.name) continue;

                const coords = await geocodeLocation(area.name);

                if (coords) {
                    processed.push({
                        ...area,
                        lat: coords.lat,
                        lon: coords.lon
                    });
                }

                // Small delay to be polite to Nominatim
                await new Promise(r => setTimeout(r, 200));
            }

            if (isMounted) {
                setGeocodedAreas(processed);
                setLoading(false);
            }
        };

        if (areas.length > 0) {
            processAreas();
        } else {
            setLoading(false);
        }

        return () => { isMounted = false; };
    }, [areas]);

    // Calculate center based on first result or default
    const center: [number, number] = geocodedAreas.length > 0
        ? [geocodedAreas[0].lat, geocodedAreas[0].lon]
        : [45.5017, -73.5673]; // Default to Montreal

    if (loading && geocodedAreas.length === 0) {
        return (
            <div className="h-[500px] w-full bg-slate-50 flex flex-col items-center justify-center rounded-[2.5rem] border border-slate-200">
                <Loader2 className="w-10 h-10 animate-spin text-slate-400 mb-4" />
                <p className="text-slate-500 font-medium">Calibrating Satellite Imagery...</p>
            </div>
        );
    }

    return (
        <div className="h-[600px] w-full rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-200/60 relative z-0">
            <MapContainer
                center={center}
                zoom={11}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {geocodedAreas.map((area) => (
                    <Marker key={area.id} position={[area.lat, area.lon]}>
                        <Popup className="custom-popup">
                            <div className="p-1 space-y-2 min-w-[200px]">
                                {area.image_url && (
                                    <div className="h-24 w-full rounded-lg overflow-hidden mb-2">
                                        <img src={area.image_url} alt={area.name} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <h3 className="font-bold text-lg leading-tight">{area.name}</h3>
                                {area.buildings && (
                                    <p className="text-xs text-slate-500 font-medium">
                                        {area.buildings.length} Buildings Established
                                    </p>
                                )}
                                <Link
                                    href={`/areas/${area.id}`}
                                    className={cn(buttonVariants({ variant: "default", size: "sm" }), "w-full mt-2 bg-slate-900 text-white hover:bg-slate-800")}
                                >
                                    View Details <ArrowRight className="w-3 h-3 ml-2" />
                                </Link>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
