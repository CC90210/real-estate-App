'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    User,
    Mail,
    Briefcase,
    CreditCard,
    DollarSign,
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    Copy,
    ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ApplicationReviewCardProps {
    application: any;
    onStatusUpdate: (id: string, status: string) => Promise<void>;
}

export function ApplicationReviewCard({ application, onStatusUpdate }: ApplicationReviewCardProps) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleCopySummary = () => {
        const summary = `
APPLICATION SUMMARY: ${application.applicant_name}
--------------------------------------------------
Property: ${application.property?.address}
Status: ${application.status.toUpperCase()}
Income: $${application.monthly_income?.toLocaleString()}/mo
Credit Score: ${application.credit_score || 'N/A'}
Employment: ${application.employer || 'N/A'}
Submitted: ${format(new Date(application.created_at), 'PPP')}
Notes: ${application.notes || 'N/A'}
--------------------------------------------------
Generated via PropFlow SaaS
        `.trim();

        navigator.clipboard.writeText(summary);
        toast.success("Summary copied to clipboard");
    };

    const scoreColor = (score: number) => {
        if (!score) return "text-slate-400";
        if (score >= 700) return "text-green-600";
        if (score >= 650) return "text-amber-600";
        return "text-red-600";
    };

    return (
        <Card className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white ring-1 ring-slate-900/5">
            <CardHeader className="bg-slate-50 border-b py-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full border shadow-sm">
                            <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold">{application.applicant_name}</CardTitle>
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {application.applicant_email}
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className={cn(
                        "capitalize",
                        application.status === 'approved' ? "bg-green-50 text-green-700 border-green-200" :
                            application.status === 'denied' ? "bg-red-50 text-red-700 border-red-200" :
                                "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                        {application.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <DollarSign className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Monthly Income</p>
                                <p className="text-sm font-semibold text-slate-900">${application.monthly_income?.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <CreditCard className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Credit Score</p>
                                <p className={cn("text-sm font-bold", scoreColor(application.credit_score))}>
                                    {application.credit_score || 'Processing...'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Briefcase className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Employment</p>
                                <p className="text-sm font-semibold text-slate-900">{application.employer || 'Not provided'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-lg">
                                <FileText className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Rent/Income Ratio</p>
                                <p className="text-sm font-semibold text-slate-900">
                                    {application.property?.rent && application.monthly_income
                                        ? `${Math.round((application.property.rent / application.monthly_income) * 100)}%`
                                        : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {application.singlekey_report_url && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1 px-2 bg-blue-600 text-[10px] font-bold text-white rounded">SINGLE KEY</div>
                                <span className="text-xs font-medium text-slate-600">Full Screening Report Ready</span>
                            </div>
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" asChild>
                                <a href={application.singlekey_report_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-3.5 h-3.5" /> View Full Report
                                </a>
                            </Button>
                        </div>
                    </div>
                )}

                {application.notes && (
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Agent Notes</p>
                        <p className="text-xs text-slate-600 italic">"{application.notes}"</p>
                    </div>
                )}
            </CardContent>

            <CardFooter className="bg-slate-50 border-t p-4 flex justify-between gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 hover:text-slate-900"
                    onClick={handleCopySummary}
                >
                    <Copy className="w-4 h-4 mr-2" /> Copy Summary
                </Button>

                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                        onClick={() => onStatusUpdate(application.id, 'denied')}
                        disabled={isUpdating || application.status === 'denied'}
                    >
                        <XCircle className="w-4 h-4 mr-2" /> Deny
                    </Button>
                    <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => onStatusUpdate(application.id, 'approved')}
                        disabled={isUpdating || application.status === 'approved'}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
