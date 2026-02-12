'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Download,
    Plus,
    UserCircle,
    Search,
    Mail,
    Phone,
    MoreHorizontal,
    Filter
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function ContactsContent() {
    const supabase = createClient()
    const [filter, setFilter] = useState<string>('all')
    const [search, setSearch] = useState('')

    // Optimized query - fetch only what's needed
    const { data: contacts, isLoading, error } = useQuery({
        queryKey: ['contacts', filter],
        queryFn: async () => {
            let query = supabase
                .from('contacts')
                .select(`
                    id,
                    name,
                    email,
                    phone,
                    type,
                    company_name,
                    tags,
                    created_at
                `)
                .order('created_at', { ascending: false })
                .limit(100)

            if (filter !== 'all') {
                query = query.eq('type', filter)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        },
        staleTime: 30000,
    })

    // Get counts efficiently
    const { data: counts } = useQuery({
        queryKey: ['contact-counts'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_contact_counts')

            // Fallback if RPC doesn't exist yet
            if (error) {
                const [prospects, tenants, vendors, landlords] = await Promise.all([
                    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('type', 'prospect'),
                    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('type', 'tenant'),
                    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('type', 'vendor'),
                    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('type', 'landlord'),
                ])

                return {
                    prospects: prospects.count || 0,
                    tenants: tenants.count || 0,
                    vendors: vendors.count || 0,
                    landlords: landlords.count || 0,
                }
            }
            return data
        },
        staleTime: 60000,
    })

    const filteredContacts = contacts?.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.company_name?.toLowerCase().includes(search.toLowerCase())
    )

    if (error) {
        return (
            <div className="p-12 text-center">
                <div className="h-12 w-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserCircle className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Failed to load contacts</h3>
                <p className="text-slate-500 mb-6">There was an error connecting to the database.</p>
                <Button onClick={() => window.location.reload()}>Retry Connection</Button>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-sm text-blue-600 font-bold uppercase tracking-widest mb-1">
                        <Users className="h-4 w-4" />
                        Intelligence CRM
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Contacts</h1>
                    <p className="text-slate-500">Manage prospects, tenants, and vendor relationships.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="rounded-xl font-bold">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl font-bold shadow-lg shadow-blue-200">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Contact
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Prospects', value: counts?.prospects || 0, type: 'prospect', color: 'blue' },
                    { label: 'Tenants', value: counts?.tenants || 0, type: 'tenant', color: 'green' },
                    { label: 'Vendors', value: counts?.vendors || 0, type: 'vendor', color: 'purple' },
                    { label: 'Landlords', value: counts?.landlords || 0, type: 'landlord', color: 'orange' },
                ].map((stat) => (
                    <button
                        key={stat.type}
                        onClick={() => setFilter(filter === stat.type ? 'all' : stat.type)}
                        className={cn(
                            "p-5 rounded-2xl border transition-all text-left group",
                            filter === stat.type
                                ? "bg-white border-blue-200 shadow-md ring-2 ring-blue-50"
                                : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
                        )}
                    >
                        <p className="text-3xl font-black text-slate-900 mb-1 group-hover:scale-105 transition-transform">
                            {stat.value}
                        </p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    </button>
                ))}
            </div>

            {/* Controls */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/30">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by name, email or company..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-white border-slate-200 rounded-xl"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="rounded-xl border-slate-200 text-slate-600">
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                        </Button>
                    </div>
                </div>

                {/* List Table */}
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Syncing contact data...</p>
                        </div>
                    ) : filteredContacts?.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <UserCircle className="h-10 w-10 text-slate-200" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">No contacts found</h3>
                            <p className="text-slate-500 max-w-xs mx-auto mb-8">
                                {search ? "We couldn't find any contacts matching your search criteria." : "Start building your database by adding your first contact."}
                            </p>
                            {search ? (
                                <Button variant="ghost" onClick={() => setSearch('')}>Clear Search</Button>
                            ) : (
                                <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl px-8">Add First Contact</Button>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredContacts?.map((contact) => (
                                    <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center text-slate-500 font-bold shadow-sm group-hover:scale-105 transition-transform">
                                                    {contact.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-lg leading-tight uppercase tracking-tight">{contact.name}</p>
                                                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                                        {contact.email && (
                                                            <span className="flex items-center gap-1 font-medium">
                                                                <Mail className="h-3 w-3" />
                                                                {contact.email}
                                                            </span>
                                                        )}
                                                        {contact.phone && (
                                                            <span className="flex items-center gap-1 font-medium">
                                                                <Phone className="h-3 w-3" />
                                                                {contact.phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm border",
                                                contact.type === 'prospect' && "bg-blue-50 text-blue-600 border-blue-100",
                                                contact.type === 'tenant' && "bg-green-50 text-green-600 border-green-100",
                                                contact.type === 'vendor' && "bg-purple-50 text-purple-600 border-purple-100",
                                                contact.type === 'landlord' && "bg-orange-50 text-orange-600 border-orange-100",
                                            )}>
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    contact.type === 'prospect' && "bg-blue-600",
                                                    contact.type === 'tenant' && "bg-green-600",
                                                    contact.type === 'vendor' && "bg-purple-600",
                                                    contact.type === 'landlord' && "bg-orange-600",
                                                )} />
                                                {contact.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:text-slate-900 transition-colors">
                                                <MoreHorizontal className="h-5 w-5" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Placeholder */}
                <div className="p-4 border-t border-slate-50 bg-slate-50/20 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Showing {filteredContacts?.length || 0} of {counts?.[filter === 'all' ? 'total' : filter] || filteredContacts?.length || 0} contacts
                    </p>
                </div>
            </div>
        </div>
    )
}

function Loader2Icon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}
