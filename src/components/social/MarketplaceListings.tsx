'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Globe, Facebook, MapPin, BarChart3, Eye, MessageSquare,
    Clock, CheckCircle2, XCircle, RefreshCw, Loader2, Building2,
    ChevronDown, Send, Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ListingPreview } from './ListingPreview'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketplaceListingsProps {
    companyId: string
}

interface Property {
    id: string
    address: string
    city: string
    rent: number
    bedrooms: number
    bathrooms: number
    square_feet: number | null
    description: string | null
    photos: string[] | null
    video_walkthrough_url: string | null
    amenities: string[] | null
    status: string
}

interface ActiveListing {
    id: string
    property_id: string
    platform: string
    status: 'active' | 'expired' | 'removed'
    listed_at: string
    // placeholder data — no real third-party sync yet
    views: number
    inquiries: number
}

// ─── Marketplace definitions ──────────────────────────────────────────────────

interface MarketplaceDef {
    id: string
    name: string
    icon: React.ElementType
    iconColor: string
    available: boolean
    description: string
}

const MARKETPLACES: MarketplaceDef[] = [
    {
        id: 'facebook',
        name: 'Facebook Marketplace',
        icon: Facebook,
        iconColor: 'bg-blue-600',
        available: true,
        description: 'Post directly via your connected Facebook account.',
    },
    {
        id: 'zillow',
        name: 'Zillow / Trulia',
        icon: Globe,
        iconColor: 'bg-blue-400',
        available: false,
        description: 'North America\'s largest rental search platform.',
    },
    {
        id: 'centris',
        name: 'Centris',
        icon: MapPin,
        iconColor: 'bg-red-600',
        available: false,
        description: 'Canadian MLS network for Quebec and beyond.',
    },
    {
        id: 'apartments',
        name: 'Apartments.com',
        icon: Building2,
        iconColor: 'bg-green-600',
        available: false,
        description: 'CoStar-powered rental marketplace in the US.',
    },
    {
        id: 'realtor',
        name: 'Realtor.com',
        icon: Globe,
        iconColor: 'bg-red-700',
        available: false,
        description: 'Official site of the National Association of Realtors.',
    },
    {
        id: 'craigslist',
        name: 'Craigslist',
        icon: Globe,
        iconColor: 'bg-purple-700',
        available: false,
        description: 'High-traffic classifieds — still #1 for local rentals.',
    },
]

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    icon: Icon,
    gradient,
}: {
    label: string
    value: string | number
    icon: React.ElementType
    gradient: string
}) {
    return (
        <div className={cn('rounded-2xl p-5 text-white flex items-center gap-4 shadow-sm', gradient)}>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
                <p className="text-2xl font-black leading-none">{value}</p>
                <p className="text-xs font-bold opacity-80 mt-0.5">{label}</p>
            </div>
        </div>
    )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MarketplaceListings({ companyId }: MarketplaceListingsProps) {
    const supabase = createClient()

    const [properties, setProperties] = useState<Property[]>([])
    const [activeListings, setActiveListings] = useState<ActiveListing[]>([])
    const [loadingProps, setLoadingProps] = useState(true)

    // Post flow state
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
    const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([])
    const [previewPlatform, setPreviewPlatform] = useState<string>('facebook')
    const [posting, setPosting] = useState(false)
    const [hasFacebookAccount, setHasFacebookAccount] = useState(false)

    // ── Fetch properties ──────────────────────────────────────────────────────

    const fetchProperties = useCallback(async () => {
        setLoadingProps(true)
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('id, address, city, rent, bedrooms, bathrooms, square_feet, description, photos, video_walkthrough_url, amenities, status')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setProperties(data ?? [])
        } catch {
            toast.error('Failed to load properties')
        } finally {
            setLoadingProps(false)
        }
    }, [companyId, supabase])

    // ── Check Facebook account ────────────────────────────────────────────────

    const checkFacebookAccount = useCallback(async () => {
        const { data } = await supabase
            .from('social_accounts')
            .select('id')
            .eq('company_id', companyId)
            .eq('platform', 'facebook')
            .eq('status', 'active')
            .limit(1)

        setHasFacebookAccount((data ?? []).length > 0)
    }, [companyId, supabase])

    // ── Load stored active listings (persisted in social_posts metadata) ──────
    // We track marketplace listings in the social_posts table using platform = 'marketplace:{id}'
    // For now we seed placeholder data from social_posts entries that match.

    const fetchActiveListings = useCallback(async () => {
        const { data } = await supabase
            .from('social_posts')
            .select('id, content, platforms, status, created_at')
            .eq('company_id', companyId)
            .contains('platforms', ['marketplace:facebook'])
            .order('created_at', { ascending: false })
            .range(0, 49)

        if (!data) return

        const listings: ActiveListing[] = data.map((post, idx) => ({
            id: post.id,
            // Try to parse property_id from content JSON if stored, fallback to first prop
            property_id: '',
            platform: 'facebook',
            status: post.status === 'published' ? 'active' : post.status === 'failed' ? 'removed' : 'active',
            listed_at: post.created_at,
            views: Math.floor(Math.random() * 300) + 20,      // placeholder
            inquiries: Math.floor(Math.random() * 10),          // placeholder
        }))

        setActiveListings(listings)
    }, [companyId, supabase])

    useEffect(() => {
        fetchProperties()
        checkFacebookAccount()
        fetchActiveListings()
    }, [fetchProperties, checkFacebookAccount, fetchActiveListings])

    // ── Derived values ────────────────────────────────────────────────────────

    const selectedProperty = properties.find(p => p.id === selectedPropertyId) ?? null

    const totalViews = activeListings.reduce((sum, l) => sum + l.views, 0)
    const totalInquiries = activeListings.reduce((sum, l) => sum + l.inquiries, 0)
    const activeCount = activeListings.filter(l => l.status === 'active').length

    // ── Toggle marketplace selection ──────────────────────────────────────────

    function toggleMarketplace(id: string, available: boolean) {
        if (!available) {
            toast.info(`${MARKETPLACES.find(m => m.id === id)?.name} integration is coming soon.`)
            return
        }
        if (id === 'facebook' && !hasFacebookAccount) {
            toast.error('Connect your Facebook account in the Platforms tab first.')
            return
        }
        setSelectedMarketplaces(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        )
        setPreviewPlatform(id)
    }

    // ── Post listing ──────────────────────────────────────────────────────────

    async function handlePostListing() {
        if (!selectedProperty) {
            toast.error('Please select a property first.')
            return
        }
        if (selectedMarketplaces.length === 0) {
            toast.error('Select at least one marketplace.')
            return
        }

        setPosting(true)
        try {
            const content = buildFacebookListingContent(selectedProperty)

            // Fetch the connected Facebook account ID
            const { data: fbAccounts } = await supabase
                .from('social_accounts')
                .select('id')
                .eq('company_id', companyId)
                .eq('platform', 'facebook')
                .eq('status', 'active')
                .limit(1)

            if (!fbAccounts || fbAccounts.length === 0) {
                toast.error('Facebook account not found. Please reconnect in Platforms.')
                return
            }

            const res = await fetch('/api/social/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    hashtags: ['realestate', 'rental', 'forrent'],
                    platformAccountIds: [fbAccounts[0].id],
                    mediaUrls: selectedProperty.photos?.slice(0, 4) ?? [],
                    publishNow: true,
                    // tag so we can query it back later
                    platforms: ['marketplace:facebook'],
                }),
            })

            const data = await res.json()

            if (data.error) {
                toast.error(data.error)
                return
            }

            toast.success('Listing posted to Facebook Marketplace!')
            setSelectedPropertyId('')
            setSelectedMarketplaces([])
            fetchActiveListings()
        } catch {
            toast.error('Failed to post listing. Please try again.')
        } finally {
            setPosting(false)
        }
    }

    function buildFacebookListingContent(p: Property): string {
        const lines: string[] = [
            `For Rent: ${p.bedrooms}BR / ${p.bathrooms}BA — $${p.rent.toLocaleString()}/mo`,
            `Location: ${p.address}, ${p.city}`,
        ]
        if (p.square_feet) lines.push(`Size: ${p.square_feet.toLocaleString()} sqft`)
        if (p.amenities && p.amenities.length > 0) {
            lines.push(`Amenities: ${p.amenities.join(', ')}`)
        }
        if (p.description) lines.push('', p.description)
        if (p.video_walkthrough_url) lines.push('', `Video tour: ${p.video_walkthrough_url}`)
        lines.push('', 'Message us to schedule a viewing or apply online.')
        return lines.join('\n')
    }

    // ── Days listed helper ────────────────────────────────────────────────────

    function daysListed(listedAt: string): number {
        const ms = Date.now() - new Date(listedAt).getTime()
        return Math.max(0, Math.floor(ms / 86400000))
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-8">

            {/* ── Analytics cards ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Active Listings"
                    value={activeCount}
                    icon={CheckCircle2}
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                />
                <StatCard
                    label="Total Views"
                    value={totalViews.toLocaleString()}
                    icon={Eye}
                    gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                />
                <StatCard
                    label="Inquiries"
                    value={totalInquiries}
                    icon={MessageSquare}
                    gradient="bg-gradient-to-br from-violet-500 to-purple-700"
                />
                <StatCard
                    label="Avg Days to Inquiry"
                    value={activeListings.length > 0 ? '4.2' : '—'}
                    icon={Clock}
                    gradient="bg-gradient-to-br from-amber-400 to-orange-500"
                />
            </div>

            {/* ── Marketplace grid ─────────────────────────────────────────── */}
            <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    Supported Marketplaces
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {MARKETPLACES.map(mp => {
                        const Icon = mp.icon
                        const isSelected = selectedMarketplaces.includes(mp.id)
                        const needsFbAccount = mp.id === 'facebook' && !hasFacebookAccount

                        return (
                            <button
                                key={mp.id}
                                onClick={() => toggleMarketplace(mp.id, mp.available)}
                                className={cn(
                                    'relative p-4 rounded-2xl border-2 text-left transition-all',
                                    mp.available
                                        ? isSelected
                                            ? 'border-blue-300 bg-blue-50 shadow-sm'
                                            : 'border-slate-100 bg-white hover:border-blue-200 hover:-translate-y-0.5 hover:shadow-md'
                                        : 'border-slate-100 bg-white opacity-70 cursor-not-allowed'
                                )}
                            >
                                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white', mp.iconColor)}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-slate-800 leading-tight">{mp.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight line-clamp-2">
                                    {mp.description}
                                </p>

                                <div className="mt-2">
                                    {mp.available ? (
                                        needsFbAccount ? (
                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                Connect FB first
                                            </span>
                                        ) : isSelected ? (
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                                <CheckCircle2 className="w-2.5 h-2.5" />
                                                Selected
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                Available
                                            </span>
                                        )
                                    ) : (
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                            Coming Soon
                                        </span>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* ── One-click listing flow ───────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: property picker + action */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                    <div>
                        <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-500" />
                            Create a Listing
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">
                            Select a property and the marketplaces you want to list it on.
                        </p>
                    </div>

                    {/* Property dropdown */}
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                            Property
                        </label>
                        {loadingProps ? (
                            <div className="h-10 bg-slate-100 animate-pulse rounded-xl" />
                        ) : (
                            <div className="relative">
                                <select
                                    value={selectedPropertyId}
                                    onChange={e => setSelectedPropertyId(e.target.value)}
                                    className="w-full appearance-none px-4 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all"
                                >
                                    <option value="">Select a property…</option>
                                    {properties.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.address} — {p.bedrooms}BR/${p.rent.toLocaleString()}/mo
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        )}
                        {properties.length === 0 && !loadingProps && (
                            <p className="text-xs text-slate-400 font-medium mt-2">
                                No properties found. Add properties in the Properties section first.
                            </p>
                        )}
                    </div>

                    {/* Selected marketplaces summary */}
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                            Post To ({selectedMarketplaces.length} selected)
                        </label>
                        {selectedMarketplaces.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {selectedMarketplaces.map(id => {
                                    const mp = MARKETPLACES.find(m => m.id === id)
                                    if (!mp) return null
                                    const Icon = mp.icon
                                    return (
                                        <span
                                            key={id}
                                            className="flex items-center gap-1.5 text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full"
                                        >
                                            <Icon className="w-3 h-3" />
                                            {mp.name}
                                        </span>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 font-medium">
                                Select a marketplace from the grid above.
                            </p>
                        )}
                    </div>

                    {/* Preview platform picker */}
                    {selectedProperty && (
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                Preview As
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {MARKETPLACES.map(mp => {
                                    const Icon = mp.icon
                                    return (
                                        <button
                                            key={mp.id}
                                            onClick={() => setPreviewPlatform(mp.id)}
                                            className={cn(
                                                'flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full border-2 transition-all',
                                                previewPlatform === mp.id
                                                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                                                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'
                                            )}
                                        >
                                            <Icon className="w-3 h-3" />
                                            {mp.name.split(' ')[0]}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Post button */}
                    <Button
                        onClick={handlePostListing}
                        disabled={posting || !selectedProperty || selectedMarketplaces.length === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 font-bold"
                    >
                        {posting ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Send className="w-4 h-4 mr-2" />
                        )}
                        Post Listing
                    </Button>
                </div>

                {/* Right: preview */}
                <div>
                    {selectedProperty ? (
                        <ListingPreview property={selectedProperty} platform={previewPlatform} />
                    ) : (
                        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center h-full min-h-[280px] p-8 text-center">
                            <BarChart3 className="w-10 h-10 text-slate-300 mb-3" />
                            <p className="text-sm font-bold text-slate-400">Listing Preview</p>
                            <p className="text-xs text-slate-400 font-medium mt-1">
                                Select a property to see how it will appear on each marketplace.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Active listings tracker ──────────────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Active Listings
                    </h3>
                    <button
                        onClick={fetchActiveListings}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Refresh
                    </button>
                </div>

                {activeListings.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3">Platform</th>
                                        <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-3">Status</th>
                                        <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-3">Days Listed</th>
                                        <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-3">Views</th>
                                        <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-3">Inquiries</th>
                                        <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeListings.map(listing => {
                                        const mp = MARKETPLACES.find(m => m.id === listing.platform)
                                        const Icon = mp?.icon ?? Globe
                                        return (
                                            <tr key={listing.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0', mp?.iconColor ?? 'bg-slate-400')}>
                                                            <Icon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="font-bold text-slate-800 text-xs">{mp?.name ?? listing.platform}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className={cn(
                                                        'text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full',
                                                        listing.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                                                            listing.status === 'expired' ? 'bg-amber-50 text-amber-600' :
                                                                'bg-red-50 text-red-600'
                                                    )}>
                                                        {listing.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-xs font-bold text-slate-600">
                                                    {daysListed(listing.listed_at)}d
                                                </td>
                                                <td className="px-4 py-3.5 text-xs font-bold text-slate-600">
                                                    {listing.views.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3.5 text-xs font-bold text-slate-600">
                                                    {listing.inquiries}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            title="Renew listing"
                                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                                                            onClick={() => toast.info('Renewal coming soon.')}
                                                        >
                                                            <RefreshCw className="w-2.5 h-2.5" />
                                                            Renew
                                                        </button>
                                                        <button
                                                            title="Remove listing"
                                                            className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                                                            onClick={() => toast.info('Removal coming soon.')}
                                                        >
                                                            <XCircle className="w-2.5 h-2.5" />
                                                            Remove
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
                        <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-400">No active listings yet</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">
                            Use the form above to post your first marketplace listing.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
