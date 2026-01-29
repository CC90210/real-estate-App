'use client';

import { motion } from 'framer-motion';
import { useApplication, useUpdateApplicationStatus } from '@/lib/hooks/useApplications';
import { useUser } from '@/lib/hooks/useUser';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
    ArrowLeft,
    User,
    MapPin,
    Briefcase,
    Calendar,
    DollarSign,
    ShieldCheck,
    AlertOctagon,
    CheckCircle2,
    XCircle,
    Copy,
    Printer
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import {
    formatCurrency,
    formatDate,
    getStatusVariant,
    canViewScreeningResults,
    copyToClipboard,
    getCreditScoreColor
} from '@/lib/utils';
import { toast } from 'sonner';

export default function ApplicationDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const applicationId = params.id as string;

    const { role } = useUser();
    const { data: application, isLoading } = useApplication(applicationId);
    const { mutate: updateStatus, isPending: isUpdating } = useUpdateApplicationStatus();

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-1/3" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="lg:col-span-2 h-[500px] rounded-xl" />
                    <Skeleton className="h-[300px] rounded-xl" />
                </div>
            </div>
        );
    }

    if (!application) return <div>Application not found</div>;

    const handleStatusChange = (status: 'approved' | 'denied' | 'withdrawn') => {
        updateStatus({ id: applicationId, status }, {
            onSuccess: () => {
                toast.success(`Application ${status} successfully`);
            },
            onError: () => {
                toast.error('Failed to update application status');
            }
        });
    };

    const copySummary = async () => {
        const summary = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━
APPLICATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Applicant: ${application.applicant_name}
Property: ${application.property?.address}, Unit ${application.property?.unit_number}
Credit Score: ${application.credit_score || 'N/A'}
Monthly Income: ${formatCurrency(application.monthly_income || 0)}
Employer: ${application.employer || 'N/A'}
Status: ${application.status.charAt(0).toUpperCase() + application.status.slice(1)} ${application.status === 'approved' ? '✓' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
        const success = await copyToClipboard(summary.trim());
        if (success) toast.success('Summary copied to clipboard');
    };

    const canReview = role === 'landlord' || role === 'admin';
    const showSensitiveData = canViewScreeningResults(role || '');

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <Button
                        variant="ghost"
                        className="pl-0 gap-2 mb-2 text-muted-foreground"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Applications
                    </Button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{application.applicant_name}</h1>
                        <Badge variant={getStatusVariant(application.status)} className="capitalize px-3 py-1">
                            {application.status}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{application.property?.address}, Unit {application.property?.unit_number}</span>
                    </div>
                </div>

                {/* Action Buttons for Reviewers */}
                {canReview && application.status === 'new' || application.status === 'screening' ? (
                    <div className="flex gap-2">
                        <Button
                            variant="destructive"
                            onClick={() => handleStatusChange('denied')}
                            disabled={isUpdating}
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Deny
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleStatusChange('approved')}
                            disabled={isUpdating}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve
                        </Button>
                    </div>
                ) : null}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Screening Results (Sensitive) */}
                    {showSensitiveData && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                                        <ShieldCheck className="w-5 h-5" />
                                        Screening Results
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="p-4 bg-background rounded-lg border text-center">
                                            <div className="text-sm text-muted-foreground mb-1">Credit Score</div>
                                            <div className={`text-3xl font-bold ${getCreditScoreColor(application.credit_score || 0)}`}>
                                                {application.credit_score || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-background rounded-lg border text-center">
                                            <div className="text-sm text-muted-foreground mb-1">Background Check</div>
                                            <div className="text-lg font-semibold flex items-center justify-center gap-2">
                                                {application.background_check_passed ? (
                                                    <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Passed</span>
                                                ) : (
                                                    <span className="text-red-600 flex items-center gap-1"><AlertOctagon className="w-4 h-4" /> Flagged</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-background rounded-lg border text-center">
                                            <div className="text-sm text-muted-foreground mb-1">Income Verified</div>
                                            <div className="text-lg font-semibold flex items-center justify-center gap-2">
                                                {application.income_verified ? (
                                                    <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Yes</span>
                                                ) : (
                                                    <span className="text-amber-600 flex items-center gap-1"><AlertOctagon className="w-4 h-4" /> Pending</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {application.screening_report_url && (
                                        <div className="mt-4 text-center">
                                            <Button variant="link" className="text-blue-600">
                                                View Full Screening Report
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Applicant Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Applicant Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                                        <User className="w-4 h-4" /> Full Name
                                    </label>
                                    <div className="font-medium text-lg">{application.applicant_name}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" /> Employer
                                    </label>
                                    <div className="font-medium text-lg">{application.employer || 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" /> Monthly Income
                                    </label>
                                    <div className="font-medium text-lg">{formatCurrency(application.monthly_income || 0)}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> Desired Move-in
                                    </label>
                                    <div className="font-medium text-lg">
                                        {application.move_in_date ? formatDate(application.move_in_date) : 'ASAP'}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-3 bg-muted/30 rounded-lg">
                                        <div className="text-sm text-muted-foreground">Occupants</div>
                                        <div className="font-medium">{application.num_occupants} People</div>
                                    </div>
                                    <div className="p-3 bg-muted/30 rounded-lg">
                                        <div className="text-sm text-muted-foreground">Pets</div>
                                        <div className="font-medium">
                                            {application.has_pets ? application.pet_details : 'None'}
                                        </div>
                                    </div>
                                </div>

                                {application.additional_notes && (
                                    <div className="p-4 bg-muted/30 rounded-lg">
                                        <div className="text-sm text-muted-foreground mb-1">Additional Notes</div>
                                        <p className="text-sm">{application.additional_notes}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Application Summary Card (Copy-friendly) */}
                    <Card className="border-2 border-dashed">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">Quick Summary</CardTitle>
                            <CardDescription>Shareable application snapshot</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm font-mono bg-muted p-4 rounded-md space-y-1">
                                <div className="border-b border-foreground/10 pb-2 mb-2 font-bold opacity-70">APPLICATION SUMMARY</div>
                                <div>Applicant: {application.applicant_name}</div>
                                <div>Property: {application.property?.address}, #{application.property?.unit_number}</div>
                                <div>Credit Score: {application.credit_score || 'N/A'}</div>
                                <div>Monthly Income: {formatCurrency(application.monthly_income || 0)}</div>
                                <div>Status: {application.status}</div>
                            </div>
                            <Button variant="outline" className="w-full" onClick={copySummary}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Summary
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Contact Info (If Authorized) */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Contact Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div>
                                <div className="text-muted-foreground">Email</div>
                                <a href={`mailto:${application.applicant_email}`} className="text-primary hover:underline">
                                    {application.applicant_email}
                                </a>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Phone</div>
                                <a href={`tel:${application.applicant_phone}`} className="text-primary hover:underline">
                                    {application.applicant_phone}
                                </a>
                            </div>
                            {application.current_address && (
                                <div>
                                    <div className="text-muted-foreground">Current Address</div>
                                    <div>{application.current_address}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
