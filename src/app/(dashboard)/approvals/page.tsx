'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    CheckCircle,
    XCircle,
    User,
    Building2,
    DollarSign,
    Briefcase,
    Phone,
    Mail
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

export default function ApprovalsPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const [denyDialog, setDenyDialog] = useState<{ open: boolean; applicationId: string | null }>({
        open: false,
        applicationId: null
    })
    const [denyReason, setDenyReason] = useState('')

    // Fetch pending applications
    const { data: applications, isLoading, error } = useQuery({
        queryKey: ['pending-applications'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('applications')
                .select(`
                    *,
                    property:properties(
                        id,
                        address,
                        unit_number,
                        rent,
                        bedrooms,
                        bathrooms
                    )
                `)
                .in('status', ['pending_landlord', 'screening', 'submitted'])
                .order('created_at', { ascending: false })

            if (error) throw error
            return data || []
        }
    })

    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: async (applicationId: string) => {
            const { data: { user } } = await supabase.auth.getUser()

            const { error } = await supabase
                .from('applications')
                .update({
                    status: 'approved',
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: user?.id
                })
                .eq('id', applicationId)

            if (error) throw error

            // Log activity
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single()

            await supabase.from('activity_log').insert({
                company_id: profile?.company_id,
                user_id: user?.id,
                action: 'approved',
                entity_type: 'application',
                entity_id: applicationId
            })
        },
        onSuccess: () => {
            toast.success('Application approved!')
            queryClient.invalidateQueries({ queryKey: ['pending-applications'] })
        },
        onError: (error: any) => {
            toast.error('Failed to approve application', { description: error.message })
        }
    })

    // Deny mutation
    const denyMutation = useMutation({
        mutationFn: async ({ applicationId, reason }: { applicationId: string; reason: string }) => {
            const { data: { user } } = await supabase.auth.getUser()

            const { error } = await supabase
                .from('applications')
                .update({
                    status: 'denied',
                    denial_reason: reason,
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: user?.id
                })
                .eq('id', applicationId)

            if (error) throw error

            // Log activity
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single()

            await supabase.from('activity_log').insert({
                company_id: profile?.company_id,
                user_id: user?.id,
                action: 'denied',
                entity_type: 'application',
                entity_id: applicationId,
                metadata: { reason }
            })
        },
        onSuccess: () => {
            toast.success('Application denied')
            queryClient.invalidateQueries({ queryKey: ['pending-applications'] })
            setDenyDialog({ open: false, applicationId: null })
            setDenyReason('')
        },
        onError: (error: any) => {
            toast.error('Failed to deny application', { description: error.message })
        }
    })

    const handleDeny = () => {
        if (denyDialog.applicationId) {
            denyMutation.mutate({
                applicationId: denyDialog.applicationId,
                reason: denyReason
            })
        }
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
                <div className="space-y-4 mt-6">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-48 w-full" />
                    ))}
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Failed to load approvals</h2>
                    <p className="text-gray-500 mb-4">{(error as Error).message}</p>
                    <Button onClick={() => window.location.reload()}>
                        Try Again
                    </Button>
                </div>
            </div>
        )
    }

    // Empty state
    if (!applications || applications.length === 0) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-2">Approvals</h1>
                <p className="text-gray-500 mb-6">Review and approve tenant applications</p>

                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
                    <p className="text-gray-500">No applications pending review</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-2">Approvals</h1>
            <p className="text-gray-500 mb-6">
                {applications.length} application{applications.length !== 1 ? 's' : ''} pending review
            </p>

            <div className="space-y-4">
                {applications.map(app => (
                    <Card key={app.id}>
                        <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                {/* Applicant Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                                            <User className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{app.applicant_name}</h3>
                                            <Badge variant={
                                                app.status === 'screening' ? 'default' :
                                                    app.status === 'pending_landlord' ? 'secondary' :
                                                        'outline'
                                            }>
                                                {app.status.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Mail className="h-4 w-4" />
                                            {app.applicant_email}
                                        </div>
                                        {app.applicant_phone && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Phone className="h-4 w-4" />
                                                {app.applicant_phone}
                                            </div>
                                        )}
                                        {app.employer && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Briefcase className="h-4 w-4" />
                                                {app.employer}
                                            </div>
                                        )}
                                        {app.monthly_income && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <DollarSign className="h-4 w-4" />
                                                ${app.monthly_income.toLocaleString()}/month income
                                            </div>
                                        )}
                                    </div>

                                    {/* Property Info */}
                                    {app.property && (
                                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Building2 className="h-4 w-4 text-gray-500" />
                                                <span className="font-medium">
                                                    {app.property.address}
                                                    {app.property.unit_number && ` #${app.property.unit_number}`}
                                                </span>
                                                <span className="text-gray-500">•</span>
                                                <span className="text-gray-600">
                                                    {app.property.bedrooms}BR / {app.property.bathrooms}BA
                                                </span>
                                                <span className="text-gray-500">•</span>
                                                <span className="font-medium text-green-600">
                                                    ${app.property.rent?.toLocaleString()}/mo
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Credit Score if available */}
                                    {app.credit_score && (
                                        <div className="mt-4">
                                            <span className="text-sm text-gray-500">Credit Score: </span>
                                            <span className={`font-bold ${app.credit_score >= 700 ? 'text-green-600' :
                                                    app.credit_score >= 600 ? 'text-amber-600' :
                                                        'text-red-600'
                                                }`}>
                                                {app.credit_score}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-row lg:flex-col gap-2">
                                    <Button
                                        onClick={() => approveMutation.mutate(app.id)}
                                        disabled={approveMutation.isPending}
                                        className="bg-green-600 hover:bg-green-700 flex-1 lg:flex-none"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setDenyDialog({ open: true, applicationId: app.id })}
                                        disabled={denyMutation.isPending}
                                        className="border-red-200 text-red-600 hover:bg-red-50 flex-1 lg:flex-none"
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Deny
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Deny Dialog */}
            <Dialog open={denyDialog.open} onOpenChange={(open) => setDenyDialog({ open, applicationId: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Deny Application</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for denying this application. This will be recorded.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Reason for denial..."
                        value={denyReason}
                        onChange={(e) => setDenyReason(e.target.value)}
                        className="min-h-24"
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDenyDialog({ open: false, applicationId: null })}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeny}
                            disabled={denyMutation.isPending || !denyReason.trim()}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Deny Application
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
