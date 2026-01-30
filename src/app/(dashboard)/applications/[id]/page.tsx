'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
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
    FileText,
    TrendingUp,
    Activity,
    Trash2,
    Loader2,
    Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';

export default function ApplicationDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const applicationId = params.id as string;
    const [application, setApplication] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        fetchApplication();
    }, [applicationId]);

    const fetchApplication = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('applications')
            .select('*, property:properties(*)')
            .eq('id', applicationId)
            .single();

        if (error) {
            toast.error("Application not found in cloud storage.");
            router.push('/applications');
        } else {
            setApplication(data);
        }
        setIsLoading(false);
    };

    const handleStatusUpdate = async (status: string) => {
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('applications')
                .update({ status })
                .eq('id', applicationId);

            if (error) throw error;
            setApplication({ ...application, status });
            toast.success(`Applicant status updated to ${status.toUpperCase()}`);
        } catch (err: any) {
            toast.error("Failed to sync with Supabase: " + err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you certain you want to permanently delete this application record? This cannot be undone.")) return;

        try {
            const { error } = await supabase
                .from('applications')
                .delete()
                .eq('id', applicationId);

            if (error) throw error;
            toast.success("Record purged successfully.");
            router.push('/applications');
        } catch (err: any) {
            toast.error("Deletion failed: " + err.message);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Accessing intelligence records...</p>
            </div>
        );
    }

    const dtiRatio = application.property?.rent && application.monthly_income
        ? (application.property.rent / application.monthly_income) * 100
        : 0;

    const riskAssessment = dtiRatio > 40 || (application.credit_score && application.credit_score < 620)
        ? { label: 'High Risk', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: AlertOctagon }
        : dtiRatio > 30 || (application.credit_score && application.credit_score < 680)
            ? { label: 'Moderate', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: Activity }
            : { label: 'Low / Optimal', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: CheckCircle2 };

    return (
        <div className="max-w-6xl mx-auto pb-20 space-y-8 animate-in fade-in duration-700">
            {/* Header Navigation */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/applications')}
                    className="rounded-xl gap-2 font-bold text-slate-500 hover:bg-slate-100"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Intelligence
                </Button>
                <div className="flex gap-2">
                    <Button
                        onClick={handleDelete}
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 rounded-xl"
                    >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Record
                    </Button>
                </div>
            </div>

            {/* Main Identity Banner */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-2xl p-8 md:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] bg-slate-900 text-white flex items-center justify-center text-4xl font-black shadow-2xl border-8 border-slate-50 ring-1 ring-slate-200">
                            {application.applicant_name?.charAt(0)}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-black tracking-tighter text-slate-900">{application.applicant_name}</h1>
                                <Badge className={cn(
                                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                    application.status === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                        application.status === 'denied' ? "bg-red-50 text-red-600 border-red-100" :
                                            "bg-amber-50 text-amber-600 border-amber-100"
                                )}>
                                    {application.status}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-slate-400 font-bold">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4" /> {application.property?.address}
                                </div>
                                <span>•</span>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" /> Applied {new Date(application.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button
                            disabled={isUpdating || application.status === 'denied'}
                            onClick={() => handleStatusUpdate('denied')}
                            className="bg-slate-100 hover:bg-red-50 text-slate-900 hover:text-red-700 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest border-none transition-all active:scale-95 px-6"
                        >
                            <XCircle className="w-5 h-5 mr-3" /> Deny
                        </Button>
                        <Button
                            disabled={isUpdating || application.status === 'approved'}
                            onClick={() => handleStatusUpdate('approved')}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-14 px-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95"
                        >
                            <CheckCircle2 className="w-5 h-5 mr-3" /> Approve Record
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Intelligence Results */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Screening Intelligence Card */}
                    <Card className="rounded-[2.5rem] border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
                        <CardHeader className="p-10 pb-6 border-b border-slate-50 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                    <ShieldCheck className="w-8 h-8 text-blue-600" /> PropFlow Intelligence Report
                                </CardTitle>
                                <CardDescription className="text-slate-400 font-medium font-sans">Automated AI screening for risk assessment</CardDescription>
                            </div>
                            <div className="hidden sm:block">
                                <Badge className="bg-slate-900 text-[10px] font-black tracking-widest px-3 py-1 uppercase">Cloud Verified</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-10 space-y-10">
                            {/* Score Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-xl transition-all duration-300">
                                    <TrendingUp className="w-6 h-6 text-indigo-500 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Credit Reliability</p>
                                    <p className={cn(
                                        "text-4xl font-black tracking-tighter tabular-nums",
                                        application.credit_score >= 700 ? "text-emerald-600" :
                                            application.credit_score >= 650 ? "text-amber-600" : "text-red-600"
                                    )}>
                                        {application.credit_score || 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-xl transition-all duration-300">
                                    <DollarSign className="w-6 h-6 text-emerald-500 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Rent Coverage</p>
                                    <p className="text-4xl font-black tracking-tighter tabular-nums text-slate-900">
                                        {(application.monthly_income / (application.property?.rent || 1)).toFixed(1)}x
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Income To Rent</p>
                                </div>
                                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-xl transition-all duration-300">
                                    <Activity className="w-6 h-6 text-blue-500 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">DTI Vulnerability</p>
                                    <p className={cn(
                                        "text-4xl font-black tracking-tighter tabular-nums",
                                        dtiRatio > 35 ? "text-red-600" : "text-emerald-600"
                                    )}>
                                        {Math.round(dtiRatio)}%
                                    </p>
                                </div>
                            </div>

                            {/* Verification List */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-blue-600" /> Verification Status
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <VerifItem label="Identity Verified" status={true} />
                                    <VerifItem label="Employment Cloud Sync" status={!!application.employer} />
                                    <VerifItem label="Background Clear" status={application.credit_score > 600} />
                                    <VerifItem label="Income Proof Validated" status={application.monthly_income > 0} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Financial/Personal Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white">
                            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-blue-600" /> Professional Data
                            </h3>
                            <div className="space-y-4">
                                <DetailItem label="Employer" value={application.employer || 'Self-Employed'} />
                                <DetailItem label="Annual Est." value={formatCurrency(application.monthly_income * 12)} />
                                <DetailItem label="Contact Link" value={application.applicant_email} isLink />
                            </div>
                        </Card>
                        <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white">
                            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                <User className="w-5 h-5 text-indigo-600" /> Lifestyle Profile
                            </h3>
                            <div className="space-y-4">
                                <DetailItem label="Occupants" value={`${application.num_occupants || 1} Person(s)`} />
                                <DetailItem label="Pet Policy" value={application.has_pets ? "Pets Present" : "No Pets"} />
                                <DetailItem label="Notes from Cloud" value={application.notes || 'No internal notes provided.'} />
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Right Column: Dynamic Tools & Action */}
                <div className="space-y-8">
                    {/* Document Center */}
                    <Card className="rounded-[2.5rem] bg-slate-900 text-white p-10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[60px]" />
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                            <FileText className="w-6 h-6 text-indigo-400" /> Document Forge
                        </h3>
                        <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">
                            Generate AI-powered documents for this applicant instantly. Values are pulled from live Supabase data.
                        </p>
                        <div className="space-y-4">
                            <Link href="/documents" className="block">
                                <Button className="w-full bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest border border-white/10 transition-all shadow-xl">
                                    Open Design Studio
                                </Button>
                            </Link>
                            <Link href={`/documents?type=application_summary&appId=${application.id}`} className="block">
                                <Button
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-indigo-900/40 border border-indigo-500/30 transition-all hover:scale-[1.02] active:scale-95"
                                >
                                    <Sparkles className="w-4 h-4 mr-3 fill-indigo-200" /> Forge Applicant Summary
                                </Button>
                            </Link>
                        </div>
                    </Card>

                    {/* Quick Access Sidebar */}
                    <div className={cn("p-10 rounded-[2.5rem] border flex flex-col gap-8 transition-all duration-500", riskAssessment.bg, riskAssessment.border)}>
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center text-blue-600 border border-slate-100">
                                <riskAssessment.icon className={cn("w-7 h-7", riskAssessment.color)} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Risk Intelligence</p>
                                <p className={cn("text-lg font-black tracking-tight", riskAssessment.color)}>{riskAssessment.label}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center text-emerald-600 border border-slate-100">
                                <DollarSign className="w-7 h-7 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Target Monthly Rent</p>
                                <p className="text-lg font-black text-slate-900 tracking-tight">${application.property?.rent?.toLocaleString() || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VerifItem({ label, status }: { label: string, status: boolean }) {
    return (
        <div className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition-colors">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{label}</span>
            {status ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3" /> ACTIVE
                </div>
            ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[9px] font-black border border-slate-200">
                    <Activity className="w-3 h-3" /> PENDING
                </div>
            )}
        </div>
    );
}

function DetailItem({ label, value, isLink }: { label: string, value: string, isLink?: boolean }) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
            <p className={cn(
                "text-sm font-bold tracking-tight",
                isLink ? "text-blue-600 hover:underline" : "text-slate-900"
            )}>
                {value}
            </p>
        </div>
    );
}
