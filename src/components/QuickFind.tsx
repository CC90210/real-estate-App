'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Search,
    Building2,
    Home,
    ClipboardList,
    Users,
    Calendar,
    FileText,
    MapPin,
    Receipt,
    Loader2,
    ArrowRight,
    Command,
    Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccentColor } from '@/lib/hooks/useAccentColor'

interface SearchResult {
    id: string
    type: 'property' | 'application' | 'area' | 'building' | 'showing' | 'invoice' | 'document' | 'landlord' | 'team'
    title: string
    subtitle: string
    icon: any
    href: string
    gradient: string
}

interface QuickFindProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function QuickFind({ open, onOpenChange }: QuickFindProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const router = useRouter()
    const supabase = createClient()
    const { company } = useAuth()
    const { colors } = useAccentColor()
    const inputRef = useRef<HTMLInputElement>(null)

    // Focus input when dialog opens
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100)
            setQuery('')
            setResults([])
            setSelectedIndex(0)
        }
    }, [open])

    // Debounced search
    useEffect(() => {
        if (!query.trim() || !company?.id) {
            setResults([])
            return
        }

        const timer = setTimeout(() => {
            performSearch(query.trim())
        }, 300)

        return () => clearTimeout(timer)
    }, [query, company?.id])

    const performSearch = async (searchQuery: string) => {
        if (!company?.id) return
        setIsSearching(true)

        const searchPattern = `%${searchQuery}%`
        const allResults: SearchResult[] = []

        try {
            // Search Properties
            try {
                const { data: properties } = await supabase
                    .from('properties')
                    .select('id, address, unit_number, status, rent')
                    .eq('company_id', company.id)
                    .or(`address.ilike.${searchPattern},unit_number.ilike.${searchPattern}`)
                    .limit(5)

                properties?.forEach((p: any) => {
                    allResults.push({
                        id: p.id,
                        type: 'property',
                        title: p.address || 'Property',
                        subtitle: `Unit ${p.unit_number || 'N/A'} • $${p.rent?.toLocaleString() || 0}/mo • ${p.status}`,
                        icon: Home,
                        href: `/properties/${p.id}`,
                        gradient: 'from-blue-500 to-blue-600'
                    })
                })
            } catch (e) { console.warn('Properties search failed:', e) }

            // Search Applications
            try {
                const { data: applications } = await supabase
                    .from('applications')
                    .select('id, applicant_name, applicant_email, status')
                    .eq('company_id', company.id)
                    .or(`applicant_name.ilike.${searchPattern},applicant_email.ilike.${searchPattern}`)
                    .limit(5)

                applications?.forEach((a: any) => {
                    allResults.push({
                        id: a.id,
                        type: 'application',
                        title: a.applicant_name || 'Unknown',
                        subtitle: `${a.applicant_email} • Status: ${a.status}`,
                        icon: ClipboardList,
                        href: `/applications/${a.id}`,
                        gradient: 'from-indigo-500 to-indigo-600'
                    })
                })
            } catch (e) { console.warn('Applications search failed:', e) }

            // Search Areas
            try {
                const { data: areas } = await supabase
                    .from('areas')
                    .select('id, name, city')
                    .eq('company_id', company.id)
                    .or(`name.ilike.${searchPattern},city.ilike.${searchPattern}`)
                    .limit(5)

                areas?.forEach((a: any) => {
                    allResults.push({
                        id: a.id,
                        type: 'area',
                        title: a.name || 'Area',
                        subtitle: a.city || 'Area',
                        icon: MapPin,
                        href: `/areas/${a.id}`,
                        gradient: 'from-emerald-500 to-emerald-600'
                    })
                })
            } catch (e) { console.warn('Areas search failed:', e) }

            // Search Buildings
            try {
                const { data: buildings } = await supabase
                    .from('buildings')
                    .select('id, name, address')
                    .eq('company_id', company.id)
                    .or(`name.ilike.${searchPattern},address.ilike.${searchPattern}`)
                    .limit(5)

                buildings?.forEach((b: any) => {
                    allResults.push({
                        id: b.id,
                        type: 'building',
                        title: b.name || b.address || 'Building',
                        subtitle: b.address || 'Building',
                        icon: Building2,
                        href: `/buildings/${b.id}`,
                        gradient: 'from-violet-500 to-violet-600'
                    })
                })
            } catch (e) { console.warn('Buildings search failed:', e) }

            // Search Showings
            try {
                const { data: showings } = await supabase
                    .from('showings')
                    .select('id, visitor_name, visitor_email, scheduled_date')
                    .eq('company_id', company.id)
                    .or(`visitor_name.ilike.${searchPattern},visitor_email.ilike.${searchPattern}`)
                    .limit(5)

                showings?.forEach((s: any) => {
                    allResults.push({
                        id: s.id,
                        type: 'showing',
                        title: s.visitor_name || 'Showing',
                        subtitle: `${s.visitor_email || ''} • ${s.scheduled_date ? new Date(s.scheduled_date).toLocaleDateString() : ''}`,
                        icon: Calendar,
                        href: `/showings`,
                        gradient: 'from-amber-500 to-amber-600'
                    })
                })
            } catch (e) { console.warn('Showings search failed:', e) }

            // Search Invoices
            try {
                const { data: invoices } = await supabase
                    .from('invoices')
                    .select('id, invoice_number, tenant_name, amount')
                    .eq('company_id', company.id)
                    .or(`invoice_number.ilike.${searchPattern},tenant_name.ilike.${searchPattern}`)
                    .limit(5)

                invoices?.forEach((i: any) => {
                    allResults.push({
                        id: i.id,
                        type: 'invoice',
                        title: `Invoice ${i.invoice_number || i.id?.slice(0, 8) || ''}`,
                        subtitle: `${i.tenant_name || 'Tenant'} • $${i.amount?.toLocaleString() || 0}`,
                        icon: Receipt,
                        href: `/invoices/${i.id}`,
                        gradient: 'from-cyan-500 to-cyan-600'
                    })
                })
            } catch (e) { console.warn('Invoices search failed:', e) }

            // Search Documents
            try {
                const { data: documents } = await supabase
                    .from('documents')
                    .select('id, title, type')
                    .eq('company_id', company.id)
                    .ilike('title', searchPattern)
                    .limit(5)

                documents?.forEach((d: any) => {
                    allResults.push({
                        id: d.id,
                        type: 'document',
                        title: d.title || 'Document',
                        subtitle: `Type: ${d.type || 'Document'}`,
                        icon: FileText,
                        href: `/documents/${d.id}`,
                        gradient: 'from-rose-500 to-rose-600'
                    })
                })
            } catch (e) { console.warn('Documents search failed:', e) }

            // Search Landlords (external landlord records)
            try {
                const { data: landlords } = await supabase
                    .from('landlords')
                    .select('id, name, email')
                    .eq('company_id', company.id)
                    .or(`name.ilike.${searchPattern},email.ilike.${searchPattern}`)
                    .limit(5)

                landlords?.forEach((l: any) => {
                    allResults.push({
                        id: l.id,
                        type: 'landlord',
                        title: l.name || 'Landlord',
                        subtitle: l.email || 'Landlord',
                        icon: Users,
                        href: `/landlords/${l.id}`,
                        gradient: 'from-purple-500 to-purple-600'
                    })
                })
            } catch (e) { console.warn('Landlords search failed:', e) }

            // Search Team Members (profiles in same company)
            try {
                const { data: teamMembers } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, role')
                    .eq('company_id', company.id)
                    .or(`full_name.ilike.${searchPattern},email.ilike.${searchPattern}`)
                    .limit(5)

                teamMembers?.forEach((t: any) => {
                    allResults.push({
                        id: t.id,
                        type: 'team' as any,
                        title: t.full_name || t.email || 'Team Member',
                        subtitle: `${t.role ? t.role.charAt(0).toUpperCase() + t.role.slice(1) : 'User'} • ${t.email || ''}`,
                        icon: Users,
                        href: `/settings`,
                        gradient: 'from-slate-500 to-slate-600'
                    })
                })
            } catch (e) { console.warn('Team members search failed:', e) }

            setResults(allResults)
            setSelectedIndex(0)
        } catch (error) {
            console.error('Search error:', error)
        } finally {
            setIsSearching(false)
        }
    }

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(i => Math.min(i + 1, results.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault()
            navigateToResult(results[selectedIndex])
        }
    }, [results, selectedIndex])

    const navigateToResult = (result: SearchResult) => {
        onOpenChange(false)
        router.push(result.href)
    }

    // Quick actions when no query
    const quickActions = [
        { label: 'Add Property', href: '/properties/new', icon: Home, gradient: 'from-blue-500 to-blue-600' },
        { label: 'View Applications', href: '/applications', icon: ClipboardList, gradient: 'from-indigo-500 to-indigo-600' },
        { label: 'Schedule Showing', href: '/showings', icon: Calendar, gradient: 'from-violet-500 to-violet-600' },
        { label: 'Create Invoice', href: '/invoices/new', icon: Receipt, gradient: 'from-emerald-500 to-emerald-600' },
        { label: 'Generate Document', href: '/documents', icon: FileText, gradient: 'from-amber-500 to-amber-600' },
    ]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
                {/* Search Header */}
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-4">
                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br", colors.gradient, colors.shadow)}>
                            <Search className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <Input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search properties, applications, invoices, documents..."
                                className="h-14 text-lg font-medium border-0 bg-transparent focus-visible:ring-0 placeholder:text-slate-400"
                            />
                        </div>
                        {isSearching && <Loader2 className={cn("h-5 w-5 animate-spin", colors.text)} />}
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                        <kbd className="px-2 py-1 bg-slate-100 rounded-lg font-mono text-[10px]">↑↓</kbd>
                        <span>Navigate</span>
                        <kbd className="px-2 py-1 bg-slate-100 rounded-lg font-mono text-[10px]">Enter</kbd>
                        <span>Select</span>
                        <kbd className="px-2 py-1 bg-slate-100 rounded-lg font-mono text-[10px]">Esc</kbd>
                        <span>Close</span>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto p-4">
                    {query.trim() === '' ? (
                        // Quick Actions
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Quick Actions</p>
                            <div className="grid grid-cols-1 gap-2">
                                {quickActions.map((action, idx) => (
                                    <button
                                        key={action.href}
                                        onClick={() => {
                                            onOpenChange(false)
                                            router.push(action.href)
                                        }}
                                        className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all duration-200 text-left"
                                    >
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110",
                                            action.gradient
                                        )}>
                                            <action.icon className="h-5 w-5" />
                                        </div>
                                        <span className="font-bold text-slate-700 group-hover:text-slate-900">{action.label}</span>
                                        <ArrowRight className={cn("h-4 w-4 text-slate-300 ml-auto group-hover:translate-x-1 transition-all", `group-hover:${colors.text}`)} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : results.length === 0 && !isSearching ? (
                        // No Results
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                <Search className="h-6 w-6 text-slate-300" />
                            </div>
                            <p className="font-bold text-slate-700">No results found</p>
                            <p className="text-sm text-slate-400 mt-1">Try a different search term</p>
                        </div>
                    ) : (
                        // Search Results
                        <div className="space-y-2">
                            {results.map((result, idx) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => navigateToResult(result)}
                                    className={cn(
                                        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 text-left",
                                        selectedIndex === idx
                                            ? cn("border-2", colors.bgLight, colors.border)
                                            : "bg-slate-50/50 hover:bg-white hover:shadow-lg border-2 border-transparent"
                                    )}
                                >
                                    <div className={cn(
                                        "h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg",
                                        result.gradient
                                    )}>
                                        <result.icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 truncate">{result.title}</p>
                                        <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                                            {result.type}
                                        </span>
                                        <ArrowRight className="h-4 w-4 text-slate-300" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Sparkles className="h-3 w-3" />
                        <span>PropFlow Quick Find</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">
                        {results.length > 0 && `${results.length} results`}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Hook to open Quick Find with keyboard shortcut
export function useQuickFind() {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K to open
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setOpen(true)
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    return { open, setOpen }
}
