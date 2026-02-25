'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { useStats } from '@/lib/hooks/useStats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
    Building2,
    Home,
    ClipboardList,
    ThumbsUp,
    Calendar,
    Wallet,
    ArrowRight,
    MapPin,
    CheckCircle,
    Eye,
    Star,
    FileText,
    Search
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useAccentColor } from '@/lib/hooks/useAccentColor'
import {
    StatCard,
    QuickActionCard,
    StatusBadge,
    DashboardSkeleton,
    getGreeting
} from './shared'

interface LandlordDashboardProps {
    onQuickFind: () => void;
}

export default function LandlordDashboard({ onQuickFind }: LandlordDashboardProps) {
    const { user, profile, company } = useAuth()
    const supabase = createClient()
    const { colors } = useAccentColor()
    const { stats, isLoading: statsLoading } = useStats()

    // Fetch recent applications for landlord's properties
    const { data: recentApplications } = useQuery({
        queryKey: ['landlord-recent-applications', user?.id],
        queryFn: async () => {
            if (!user?.email) return []

            // Find landlord record by email
            const { data: landlordRecords } = await supabase
                .from('landlords')
                .select('id')
                .eq('email', user.email)

            const landlordIds = landlordRecords?.map(l => l.id) || []
            if (landlordIds.length === 0) return []

            const { data: properties } = await supabase
                .from('properties')
                .select('id')
                .in('landlord_id', landlordIds)

            const propertyIds = properties?.map(p => p.id) || []
            if (propertyIds.length === 0) return []

            const { data } = await supabase
                .from('applications')
                .select(`
                    id,
                    applicant_name,
                    applicant_email,
                    status,
                    created_at,
                    property:properties(address, unit_number, rent)
                `)
                .in('property_id', propertyIds)
                .order('created_at', { ascending: false })
                .limit(5)

            return data || []
        },
        enabled: !!user?.id
    })

    // Fetch landlord's properties
    const { data: properties } = useQuery({
        queryKey: ['landlord-properties', user?.id],
        queryFn: async () => {
            if (!user?.email) return []

            const { data: landlordRecords } = await supabase
                .from('landlords')
                .select('id')
                .eq('email', user.email)

            const landlordIds = landlordRecords?.map(l => l.id) || []
            if (landlordIds.length === 0) return []

            const { data } = await supabase
                .from('properties')
                .select('id, address, unit_number, rent, status, bedrooms, bathrooms')
                .in('landlord_id', landlordIds)
                .order('created_at', { ascending: false })
                .limit(6)

            return data || []
        },
        enabled: !!user?.id
    })

    if (statsLoading && !stats) {
        return <DashboardSkeleton />
    }

    const today = format(new Date(), 'EEEE, MMMM d, yyyy')

    return (
        <div className="relative p-6 lg:p-10 space-y-8">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className={cn("absolute top-[5%] left-[15%] w-[50rem] h-[50rem] rounded-full blur-[120px] animate-float", colors.bgLight)} />
                <div className="absolute bottom-[10%] right-[5%] w-[40rem] h-[40rem] bg-gradient-to-br from-blue-100/30 to-indigo-100/30 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-4s' }} />
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-slate-400 text-sm font-medium animate-in fade-in slide-in-from-left duration-500">
                        <Calendar className="h-4 w-4" />
                        <span>{today}</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 animate-in fade-in slide-in-from-left duration-700">
                        {getGreeting()}, <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", colors.gradient)}>
                            {profile?.full_name?.split(' ')[0] || 'Landlord'}
                        </span>
                    </h1>
                    <div className="flex items-center gap-3">
                        <Badge className={cn("text-white font-black uppercase text-[10px] tracking-widest px-3 py-1 border-0 hover:opacity-90", colors.bg)}>
                            Property Owner
                        </Badge>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {company?.name || 'Your Company'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right duration-700">
                    <Button
                        variant="outline"
                        onClick={onQuickFind}
                        className="h-12 px-6 rounded-2xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all bg-white/80 backdrop-blur-sm shadow-lg shadow-slate-100"
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Quick Find
                        <kbd className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono hidden lg:inline">⌘K</kbd>
                    </Button>
                    <Button asChild className={cn("h-12 px-8 rounded-2xl text-white font-bold shadow-xl border-0 bg-gradient-to-r", colors.gradient, colors.shadow)}>
                        <Link href="/properties">
                            <Eye className="h-5 w-5 mr-2" />
                            View All Properties
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Revenue Banner */}
            <div className="animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '100ms' }}>
                <div className={cn("relative overflow-hidden p-8 rounded-3xl shadow-2xl bg-gradient-to-r", colors.gradient, colors.shadow)}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Wallet className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <p className="text-white/70 text-sm font-bold uppercase tracking-widest">Monthly Rental Income</p>
                                <p className="text-4xl lg:text-5xl font-black text-white">${stats?.monthlyRevenue?.toLocaleString() || 0}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-8 text-white/80">
                            <div className="text-center">
                                <p className="text-3xl font-black text-white">{stats?.rentedProperties || 0}</p>
                                <p className="text-xs font-bold uppercase tracking-widest">Rented Units</p>
                            </div>
                            <div className="w-px h-12 bg-white/20" />
                            <div className="text-center">
                                <p className="text-3xl font-black text-white">{stats?.availableProperties || 0}</p>
                                <p className="text-xs font-bold uppercase tracking-widest">Available</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '200ms' }}>
                <StatCard
                    title="Collected Revenue"
                    value={`$${(stats?.totalMonthlyRevenue || 0).toLocaleString()}`}
                    subtitle="Invoices paid this month"
                    icon={Wallet}
                    gradient="from-emerald-500 to-emerald-600"
                    href="/invoices"
                />
                <StatCard
                    title="My Properties"
                    value={stats?.totalProperties || 0}
                    subtitle={`${stats?.availableProperties || 0} available`}
                    icon={Home}
                    gradient={colors.gradient}
                    href="/properties"
                />
                <StatCard
                    title="Pending Review"
                    value={stats?.pendingApplications || 0}
                    subtitle="Applications awaiting approval"
                    icon={ClipboardList}
                    gradient="from-amber-500 to-amber-600"
                    href="/landlord/applications"
                    urgent={(stats?.pendingApplications || 0) > 0}
                />
                <StatCard
                    title="Upcoming"
                    value={stats?.upcomingShowings || 0}
                    subtitle="Scheduled visits"
                    icon={Calendar}
                    gradient="from-violet-500 to-violet-600"
                    href="/showings"
                />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '300ms' }}>
                {/* Recent Applications */}
                <Card className="rounded-[2rem] border-slate-100/50 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/30">
                    <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-200">
                                <ClipboardList className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black text-slate-900">Pending Applications</CardTitle>
                                <p className="text-sm text-slate-500">Require your decision</p>
                            </div>
                        </div>
                        <Link href="/landlord/applications" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                            View All <ArrowRight className="h-4 w-4" />
                        </Link>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        {(!recentApplications || recentApplications.length === 0) ? (
                            <div className="text-center py-12">
                                <CheckCircle className="h-12 w-12 text-emerald-300 mx-auto mb-4" />
                                <p className="font-bold text-slate-700">All caught up!</p>
                                <p className="text-sm text-slate-400">No pending applications</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentApplications?.map((app: any) => {
                                    const property = Array.isArray(app.property) ? app.property[0] : app.property
                                    return (
                                        <Link key={app.id} href={`/landlord/applications`}>
                                            <div className={cn("group p-4 rounded-2xl bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all duration-200 cursor-pointer border border-transparent", colors.borderHover)}>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-slate-900 truncate">{app.applicant_name}</p>
                                                            <StatusBadge status={app.status} />
                                                        </div>
                                                        <p className="text-sm text-slate-500 truncate mt-1">
                                                            <MapPin className="h-3 w-3 inline mr-1" />
                                                            {property?.address || 'Property'} {property?.unit_number ? `#${property.unit_number}` : ''}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className={cn("text-lg font-black", colors.text)}>${property?.rent?.toLocaleString()}/mo</span>
                                                        <ArrowRight className={cn("h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-all", `group-hover:${colors.text}`)} />
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* My Properties */}
                <Card className="rounded-[2rem] border-slate-100/50 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/30">
                    <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                                <Home className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black text-slate-900">My Properties</CardTitle>
                                <p className="text-sm text-slate-500">Your portfolio</p>
                            </div>
                        </div>
                        <Link href="/properties" className={cn("text-sm font-bold flex items-center gap-1", colors.text, `hover:${colors.textHover}`)}>
                            View All <ArrowRight className="h-4 w-4" />
                        </Link>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        {(!properties || properties.length === 0) ? (
                            <div className="text-center py-12">
                                <Home className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                <p className="font-bold text-slate-700">No properties yet</p>
                                <p className="text-sm text-slate-400">Properties you own will appear here</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {properties?.map((property: any) => (
                                    <Link key={property.id} href={`/properties/${property.id}`}>
                                        <div className="group p-4 rounded-2xl bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all duration-200 cursor-pointer border border-transparent hover:border-emerald-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <PropertyStatusBadge status={property.status} />
                                                <span className={cn("text-lg font-black", colors.text)}>${property.rent?.toLocaleString()}</span>
                                            </div>
                                            <p className="font-bold text-slate-900 text-sm truncate">{property.address}</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {property.unit_number ? `Unit ${property.unit_number} • ` : ''}
                                                {property.bedrooms} bed • {property.bathrooms} bath
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '400ms' }}>
                <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <QuickActionCard
                        title="Review Applications"
                        description="Approve or deny pending"
                        icon={ClipboardList}
                        color="amber"
                        href="/landlord/applications"
                        badge={(stats?.pendingApplications ?? 0) > 0 ? `${stats?.pendingApplications} pending` : undefined}
                    />
                    <QuickActionCard
                        title="View Properties"
                        description="Manage your portfolio"
                        icon={Home}
                        color="emerald"
                        href="/properties"
                    />
                    <QuickActionCard
                        title="View Showings"
                        description="Scheduled visits"
                        icon={Calendar}
                        color="violet"
                        href="/showings"
                    />
                    <QuickActionCard
                        title="Generate Report"
                        description="Portfolio summary"
                        icon={FileText}
                        color="blue"
                        href="/documents"
                    />
                </div>
            </div>
        </div>
    )
}

function PropertyStatusBadge({ status }: { status: string }) {
    const configs: Record<string, { bg: string; text: string }> = {
        'available': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
        'rented': { bg: 'bg-blue-100', text: 'text-blue-700' },
        'pending': { bg: 'bg-amber-100', text: 'text-amber-700' },
        'maintenance': { bg: 'bg-orange-100', text: 'text-orange-700' },
    }
    const config = configs[status] || { bg: 'bg-slate-100', text: 'text-slate-700' }
    return (
        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black uppercase", config.bg, config.text)}>
            {status}
        </span>
    )
}
