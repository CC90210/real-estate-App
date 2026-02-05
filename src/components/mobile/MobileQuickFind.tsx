'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button' // Fixed import: 'button' -> 'Button' 
import {
    Search,
    Home,
    ClipboardList,
    Users,
    FileText,
    Calendar,
    Receipt,
    ArrowRight,
    Plus,
    Loader2,
    X,
    Building,
    MapPin
} from 'lucide-react'

// Quick Actions - Always visible, no search needed
const quickActions = [
    {
        name: 'Add Property',
        href: '/properties?action=new',
        icon: Home,
        color: 'bg-blue-500',
        description: 'List a new property'
    },
    {
        name: 'New Application',
        href: '/applications?action=new',
        icon: ClipboardList,
        color: 'bg-green-500',
        description: 'Add tenant application'
    },
    {
        name: 'Schedule Showing',
        href: '/showings?action=new',
        icon: Calendar,
        color: 'bg-purple-500',
        description: 'Book property showing'
    },
    {
        name: 'Create Invoice',
        href: '/invoices?action=new',
        icon: Receipt,
        color: 'bg-amber-500',
        description: 'Generate new invoice'
    },
]

// Navigation shortcuts
const goToPages = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Properties', href: '/properties', icon: Building },
    { name: 'Applications', href: '/applications', icon: ClipboardList },
    { name: 'Showings', href: '/showings', icon: Calendar },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Invoices', href: '/invoices', icon: Receipt },
    { name: 'Landlords', href: '/landlords', icon: Users },
]

interface MobileQuickFindProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function MobileQuickFind({ open, onOpenChange }: MobileQuickFindProps) {
    const router = useRouter()
    const supabase = createClient()
    const inputRef = useRef<HTMLInputElement>(null)

    const [query, setQuery] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [results, setResults] = useState<{
        properties: any[]
        applications: any[]
        landlords: any[]
    }>({ properties: [], applications: [], landlords: [] })

    // Focus input when modal opens
    useEffect(() => {
        if (open) {
            // Small delay to ensure modal is rendered
            const timer = setTimeout(() => {
                inputRef.current?.focus()
            }, 100)
            return () => clearTimeout(timer)
        } else {
            // Reset state when closed
            setQuery('')
            setResults({ properties: [], applications: [], landlords: [] })
        }
    }, [open])

    // Debounced search
    useEffect(() => {
        if (!query || query.length < 2) {
            setResults({ properties: [], applications: [], landlords: [] })
            return
        }

        const searchTimeout = setTimeout(async () => {
            setIsSearching(true)

            try {
                const [propsRes, appsRes, landlordsRes] = await Promise.all([
                    supabase
                        .from('properties')
                        .select('id, address, unit_number, status, rent')
                        .or(`address.ilike.%${query}%,unit_number.ilike.%${query}%`)
                        .limit(5),
                    supabase
                        .from('applications')
                        .select('id, applicant_name, applicant_email, status')
                        .or(`applicant_name.ilike.%${query}%,applicant_email.ilike.%${query}%`)
                        .limit(5),
                    supabase
                        .from('landlords')
                        .select('id, name, email')
                        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
                        .limit(5)
                ])

                setResults({
                    properties: propsRes.data || [],
                    applications: appsRes.data || [],
                    landlords: landlordsRes.data || []
                })
            } catch (error) {
                console.error('Search error:', error)
            } finally {
                setIsSearching(false)
            }
        }, 300)

        return () => clearTimeout(searchTimeout)
    }, [query, supabase])

    const navigate = useCallback((href: string) => {
        router.push(href)
        onOpenChange(false)
    }, [router, onOpenChange])

    const hasResults = results.properties.length > 0 ||
        results.applications.length > 0 ||
        results.landlords.length > 0

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available': return 'bg-green-100 text-green-700'
            case 'leased': return 'bg-blue-100 text-blue-700'
            case 'pending': return 'bg-yellow-100 text-yellow-700'
            case 'approved': return 'bg-green-100 text-green-700'
            case 'denied': return 'bg-red-100 text-red-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 gap-0 max-w-lg mx-4 max-h-[80vh] overflow-hidden rounded-2xl">
                {/* Search Header - Sticky */}
                <div className="sticky top-0 bg-white z-10 p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search properties, applications, landlords..."
                            className="pl-12 pr-12 h-12 text-base rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center"
                            >
                                <X className="h-4 w-4 text-gray-500" />
                            </button>
                        )}
                        {isSearching && (
                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500 animate-spin" />
                        )}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 overscroll-contain">

                    {/* Search Results */}
                    {query && hasResults && (
                        <div className="p-4">
                            {/* Properties */}
                            {results.properties.length > 0 && (
                                <div className="mb-6">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                                        Properties
                                    </p>
                                    <div className="space-y-2">
                                        {results.properties.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => navigate(`/properties/${p.id}`)}
                                                className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors text-left"
                                            >
                                                <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                    <Home className="h-6 w-6 text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">
                                                        {p.address}
                                                        {p.unit_number && ` #${p.unit_number}`}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(p.status)}`}>
                                                            {p.status}
                                                        </span>
                                                        {p.rent && (
                                                            <span className="text-sm text-gray-500">
                                                                ${Number(p.rent).toLocaleString()}/mo
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Applications */}
                            {results.applications.length > 0 && (
                                <div className="mb-6">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                                        Applications
                                    </p>
                                    <div className="space-y-2">
                                        {results.applications.map((a) => (
                                            <button
                                                key={a.id}
                                                onClick={() => navigate(`/applications/${a.id}`)}
                                                className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors text-left"
                                            >
                                                <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                    <ClipboardList className="h-6 w-6 text-green-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{a.applicant_name}</p>
                                                    <p className="text-sm text-gray-500 truncate">{a.applicant_email}</p>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${getStatusColor(a.status)}`}>
                                                    {a.status}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Landlords */}
                            {results.landlords.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                                        Landlords
                                    </p>
                                    <div className="space-y-2">
                                        {results.landlords.map((l) => (
                                            <button
                                                key={l.id}
                                                onClick={() => navigate(`/landlords/${l.id}`)}
                                                className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors text-left"
                                            >
                                                <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                    <Users className="h-6 w-6 text-purple-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{l.name}</p>
                                                    <p className="text-sm text-gray-500 truncate">{l.email}</p>
                                                </div>
                                                <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* No Results */}
                    {query && query.length >= 2 && !hasResults && !isSearching && (
                        <div className="p-8 text-center">
                            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="font-medium text-gray-900 mb-1">No results found</p>
                            <p className="text-sm text-gray-500">
                                Try a different search term
                            </p>
                        </div>
                    )}

                    {/* Default State - Quick Actions & Navigation */}
                    {!query && (
                        <>
                            {/* Quick Actions */}
                            <div className="p-4 border-b">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                                    Quick Actions
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    {quickActions.map((action) => {
                                        const Icon = action.icon
                                        return (
                                            <button
                                                key={action.name}
                                                onClick={() => navigate(action.href)}
                                                className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                                            >
                                                <div className={`h-10 w-10 ${action.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                                    <Icon className="h-5 w-5 text-white" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm truncate">{action.name}</p>
                                                    <p className="text-xs text-gray-500 truncate">{action.description}</p>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Go To Pages */}
                            <div className="p-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                                    Go To
                                </p>
                                <div className="space-y-1">
                                    {goToPages.map((page) => {
                                        const Icon = page.icon
                                        return (
                                            <button
                                                key={page.href}
                                                onClick={() => navigate(page.href)}
                                                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                                            >
                                                <Icon className="h-5 w-5 text-gray-500" />
                                                <span className="flex-1 font-medium">{page.name}</span>
                                                <ArrowRight className="h-4 w-4 text-gray-300" />
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Keyboard Hint (hidden on mobile, shown on desktop) */}
                <div className="hidden md:flex items-center justify-center p-3 border-t bg-gray-50 text-sm text-gray-500">
                    <kbd className="px-2 py-1 bg-white border rounded text-xs mr-1">⌘</kbd>
                    <kbd className="px-2 py-1 bg-white border rounded text-xs mr-2">K</kbd>
                    to open anytime
                </div>
            </DialogContent>
        </Dialog>
    )
}
