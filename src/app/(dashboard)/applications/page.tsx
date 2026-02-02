'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    User,
    Building2,
    Mail,
    Phone,
    DollarSign,
    Calendar,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    RefreshCw
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

export default function ApplicationsPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    // Fetch applications with SAFE property join
    const { data: applications, isLoading, error, refetch } = useQuery({
        queryKey: ['applications', statusFilter],
        queryFn: async () => {
            let query = supabase
                .from('applications')
                .select(`
                    *,
                    property:properties(id, address, unit_number, rent)
                `)
                .order('created_at', { ascending: false })

            // Filter by status
            if (statusFilter && statusFilter !== 'all') {
                query = query.eq('status', statusFilter)
            }

            const { data, error } = await query

            if (error) {
                console.error('Applications fetch error:', error)
                throw error
            }

            return data || []
        },
        retry: 2,
        staleTime: 30000 // 30 seconds
    })

    // Update status mutation
    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { data: { user } } = await supabase.auth.getUser()

            const { data, error } = await supabase
                .from('applications')
                .update({
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            // Log activity
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single()

            if (profile?.company_id) {
                const { error: logError } = await supabase.from('activity_log').insert({
                    company_id: profile.company_id,
                    user_id: user?.id,
                    action: status === 'approved' ? 'approved' : status === 'denied' ? 'denied' : 'updated',
                    entity_type: 'application',
                    entity_id: id,
                    metadata: { new_status: status }
                })
                if (logError) console.error('Activity log failed:', logError)
            }

            return data
        },
        onSuccess: () => {
            toast.success('Application updated!')
            queryClient.invalidateQueries({ queryKey: ['applications'] })
        },
        onError: (error: any) => {
            console.error('Update error:', error)
            toast.error('Failed to update application', {
                description: error.message
            })
        }
    })

    // Filter applications by search term
    const filteredApplications = applications?.filter(app => {
        if (!searchTerm) return true
        const search = searchTerm.toLowerCase()

        // Handle potentially null/undefined properties safely
        const applicantName = app.applicant_name?.toLowerCase() || ''
        const applicantEmail = app.applicant_email?.toLowerCase() || ''

        // Safe property access - property might be null, or an array if join inferred wrong
        let address = ''
        if (app.property) {
            if (Array.isArray(app.property)) {
                address = app.property[0]?.address?.toLowerCase() || ''
            } else {
                address = (app.property as any)?.address?.toLowerCase() || ''
            }
        }

        return (
            applicantName.includes(search) ||
            applicantEmail.includes(search) ||
            address.includes(search)
        )
    })

    // Loading state
    if (isLoading) {
        return (
            <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="flex gap-4">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-40" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-32 w-full" />
                    ))}
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center py-12">
                    <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Failed to load applications</h2>
                    <p className="text-gray-500 mb-4">{(error as Error).message}</p>
                    <Button onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Applications</h1>
                    <p className="text-gray-500">
                        {filteredApplications?.length || 0} application{filteredApplications?.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by name, email, or address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="screening">Screening</SelectItem>
                        <SelectItem value="pending_landlord">Pending Landlord</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="denied">Denied</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Applications List */}
            {!filteredApplications || filteredApplications.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-1">No applications found</h3>
                    <p className="text-gray-500">
                        {searchTerm || statusFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Applications will appear here when submitted'
                        }
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredApplications.map(app => (
                        <ApplicationCard
                            key={app.id}
                            application={app}
                            onApprove={() => updateStatus.mutate({ id: app.id, status: 'approved' })}
                            onDeny={() => updateStatus.mutate({ id: app.id, status: 'denied' })}
                            isUpdating={updateStatus.isPending}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// Application Card Component with NULL SAFETY
function ApplicationCard({
    application,
    onApprove,
    onDeny,
    isUpdating
}: {
    application: any
    onApprove: () => void
    onDeny: () => void
    isUpdating: boolean
}) {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
        new: { label: 'New', color: 'bg-blue-100 text-blue-700', icon: Clock },
        submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: Clock },
        screening: { label: 'Screening', color: 'bg-amber-100 text-amber-700', icon: Clock },
        pending_landlord: { label: 'Pending Review', color: 'bg-purple-100 text-purple-700', icon: Clock },
        approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
        denied: { label: 'Denied', color: 'bg-red-100 text-red-700', icon: XCircle }
    }

    const status = statusConfig[application.status] || statusConfig.new
    const StatusIcon = status.icon
    const canTakeAction = ['new', 'submitted', 'screening', 'pending_landlord'].includes(application.status)

    // SAFE property access
    // Handle array or object
    let property: any = application.property
    if (Array.isArray(property)) {
        property = property[0]
    }

    const propertyAddress = property?.address || 'Property not found'
    const propertyUnit = property?.unit_number
    const propertyRent = property?.rent

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                    {/* Main Info */}
                    <div className="flex-1 p-4 lg:p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                                    <User className="h-6 w-6 text-gray-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">
                                        {application.applicant_name || 'Unknown Applicant'}
                                    </h3>
                                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${status.color}`}>
                                        <StatusIcon className="h-3 w-3" />
                                        {status.label}
                                    </div>
                                </div>
                            </div>
                            <span className="text-xs text-gray-400">
                                {application.created_at
                                    ? formatDistanceToNow(new Date(application.created_at), { addSuffix: true })
                                    : 'Unknown date'
                                }
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            {/* Email */}
                            {application.applicant_email && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Mail className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{application.applicant_email}</span>
                                </div>
                            )}

                            {/* Phone */}
                            {application.applicant_phone && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Phone className="h-4 w-4 flex-shrink-0" />
                                    <span>{application.applicant_phone}</span>
                                </div>
                            )}

                            {/* Income */}
                            {application.monthly_income && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <DollarSign className="h-4 w-4 flex-shrink-0" />
                                    <span>${Number(application.monthly_income).toLocaleString()}/mo income</span>
                                </div>
                            )}

                            {/* Move-in date */}
                            {application.move_in_date && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Calendar className="h-4 w-4 flex-shrink-0" />
                                    <span>Move-in: {new Date(application.move_in_date).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>

                        {/* Property Info - SAFE */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                <span className="font-medium">
                                    {propertyAddress}
                                    {propertyUnit && ` #${propertyUnit}`}
                                </span>
                                {propertyRent && (
                                    <>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-green-600 font-medium">
                                            ${Number(propertyRent).toLocaleString()}/mo
                                        </span>
                                    </>
                                )}
                            </div>
                            {!property && (
                                <p className="text-xs text-amber-600 mt-1">
                                    ⚠️ The property associated with this application may have been removed
                                </p>
                            )}
                        </div>

                        {/* Credit Score if available */}
                        {application.credit_score && (
                            <div className="mt-3">
                                <span className="text-sm text-gray-500">Credit Score: </span>
                                <span className={`font-bold ${application.credit_score >= 700 ? 'text-green-600' :
                                    application.credit_score >= 600 ? 'text-amber-600' :
                                        'text-red-600'
                                    }`}>
                                    {application.credit_score}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    {canTakeAction && (
                        <div className="flex lg:flex-col gap-2 p-4 lg:p-6 lg:border-l bg-gray-50 lg:bg-transparent">
                            <Button
                                onClick={onApprove}
                                disabled={isUpdating}
                                className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                            </Button>
                            <Button
                                variant="outline"
                                onClick={onDeny}
                                disabled={isUpdating}
                                className="flex-1 lg:flex-none border-red-200 text-red-600 hover:bg-red-50"
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Deny
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
