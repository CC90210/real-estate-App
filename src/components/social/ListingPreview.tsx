'use client'

import { MapPin, BedDouble, Bath, Maximize2, Facebook, Globe, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ListingPreviewProps {
    property: {
        address: string
        rent: number
        bedrooms: number
        bathrooms: number
        square_feet: number | null
        description: string | null
        photos: string[] | null
        video_walkthrough_url: string | null
        amenities: string[] | null
    }
    platform: string
}

const PLATFORM_META: Record<string, { label: string; accentClass: string; hint: string }> = {
    facebook: {
        label: 'Facebook Marketplace',
        accentClass: 'bg-blue-600',
        hint: 'Listings appear in the local Marketplace feed. Include clear photos for best results.',
    },
    zillow: {
        label: 'Zillow / Trulia',
        accentClass: 'bg-blue-500',
        hint: 'Zillow surfaces listings with high-quality photos and detailed amenity lists.',
    },
    centris: {
        label: 'Centris',
        accentClass: 'bg-red-600',
        hint: 'Canadian MLS network. Listings must meet OACIQ compliance standards.',
    },
    apartments: {
        label: 'Apartments.com',
        accentClass: 'bg-green-600',
        hint: 'Renters search by price, beds, and neighbourhood. Complete descriptions perform best.',
    },
    realtor: {
        label: 'Realtor.com',
        accentClass: 'bg-red-700',
        hint: 'Realtor.com displays agent branding alongside each listing.',
    },
    craigslist: {
        label: 'Craigslist',
        accentClass: 'bg-purple-700',
        hint: 'Plain-text focused. Keep descriptions concise and include a contact method.',
    },
}

export function ListingPreview({ property, platform }: ListingPreviewProps) {
    const meta = PLATFORM_META[platform] ?? {
        label: platform,
        accentClass: 'bg-slate-600',
        hint: 'Preview of your listing as it will appear on this platform.',
    }

    const title = `${property.bedrooms}BR / ${property.bathrooms}BA — $${property.rent.toLocaleString()}/mo`
    const coverPhoto = property.photos?.[0] ?? null
    const descriptionExcerpt = property.description
        ? property.description.length > 200
            ? `${property.description.slice(0, 200).trimEnd()}…`
            : property.description
        : null

    return (
        <div className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden bg-white">
            {/* Platform header bar */}
            <div className={cn('px-4 py-2.5 flex items-center gap-2', meta.accentClass)}>
                {platform === 'facebook' ? (
                    <Facebook className="w-4 h-4 text-white flex-shrink-0" />
                ) : (
                    <Globe className="w-4 h-4 text-white flex-shrink-0" />
                )}
                <span className="text-xs font-bold text-white uppercase tracking-widest">{meta.label}</span>
            </div>

            {/* Cover photo */}
            <div className="relative w-full aspect-video bg-slate-100 overflow-hidden">
                {coverPhoto ? (
                    <img
                        src={coverPhoto}
                        alt={property.address}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300">
                        <MapPin className="w-10 h-10" />
                        <span className="text-xs font-medium">No photo uploaded</span>
                    </div>
                )}
                {property.video_walkthrough_url && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        <Play className="w-3 h-3" />
                        Video tour
                    </div>
                )}
            </div>

            {/* Listing body */}
            <div className="p-4 space-y-3">
                <div>
                    <p className="font-black text-slate-900 text-sm leading-snug">{title}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {property.address}
                    </p>
                </div>

                {/* Key stats */}
                <div className="flex items-center gap-3 text-xs text-slate-600 font-bold">
                    <span className="flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                        {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                        <Bath className="w-3.5 h-3.5 text-slate-400" />
                        {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}
                    </span>
                    {property.square_feet && (
                        <span className="flex items-center gap-1">
                            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                            {property.square_feet.toLocaleString()} sqft
                        </span>
                    )}
                </div>

                {/* Amenities */}
                {property.amenities && property.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {property.amenities.slice(0, 6).map((amenity, i) => (
                            <span
                                key={i}
                                className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                            >
                                {amenity}
                            </span>
                        ))}
                        {property.amenities.length > 6 && (
                            <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5">
                                +{property.amenities.length - 6} more
                            </span>
                        )}
                    </div>
                )}

                {/* Description */}
                {descriptionExcerpt && (
                    <p className="text-xs text-slate-500 font-medium leading-relaxed border-t border-slate-50 pt-3">
                        {descriptionExcerpt}
                    </p>
                )}

                {/* Platform hint */}
                <div className="border-t border-slate-50 pt-3">
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        {meta.hint}
                    </p>
                </div>
            </div>
        </div>
    )
}
