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
    FileText,
    TrendingUp,
    Activity,
    Trash2,
    Loader2,
    Sparkles,
    AlertTriangle,
    Edit,
    CigaretteOff,
    Cigarette,
    Car,
    PawPrint,
    Home,
    Phone,
    Mail,
    Clock,
    Users,
} from 'lucide-react';
import { EditApplicationModal } from '@/components/applications/EditApplicationModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApplicationDocuments } from '@/components/applications/ApplicationDocuments';
import { ScreeningReportUpload } from '@/components/applications/ScreeningReportUpload';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Property {
    id: string;
    address: string;
    rent: number;
    [key: string]: unknown;
}

interface Application {
    id: string;
    applicant_name: string;
    applicant_email: string;
    applicant_phone?: string;
    status: string;
    created_at: string;
    company_id?: string;
    property_id?: string;
    property?: Property | null;
    // Financial
    credit_score?: number;
    monthly_income?: number;
    combined_household_income?: number;
    total_debt?: number;
    income_to_rent_ratio?: number;
    yearly_rent_cost?: number;
    dti_ratio?: number;
    current_rent?: number;
    // Employment
    employer?: string;
    employment_status?: string;
    employment_duration?: string;
    // Lifestyle
    num_occupants?: number;
    has_pets?: boolean;
    pet_details?: string;
    num_vehicles?: number;
    is_smoker?: boolean;
    // Landlord reference
    current_landlord_name?: string;
    current_landlord_phone?: string;
    // Verification checks
    income_verified?: boolean;
    government_id_verified?: boolean;
    background_check_passed?: boolean;
    criminal_check_passed?: boolean;
    public_records_clear?: boolean;
    // SingleKey
    singlekey_report_url?: string;
    // Review metadata
    denial_reason?: string;
    reviewed_at?: string;
    reviewed_by?: string;
    // Misc
    notes?: string;
    move_in_date?: string;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ApplicationDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const applicationId = params.id as string;
    const [application, setApplication] = useState<Application | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        fetchApplication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applicationId]);

    const fetchApplication = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('applications')
            .select('*, property:properties(*)')
            .eq('id', applicationId)
            .single();

        if (error) {
            toast.error('Application not found');
            router.push('/applications');
        } else {
            const appData = { ...data } as Application;
            if (Array.isArray(appData.property)) {
                appData.property = (appData.property as Property[])[0] ?? null;
            }
            setApplication(appData);
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
            setApplication((prev) => (prev ? { ...prev, status } : prev));
            toast.success(`Applicant status updated to ${status.toUpperCase()}`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error('Failed to update status: ' + message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you certain you want to permanently delete this application record? This cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('applications')
                .delete()
                .eq('id', applicationId);

            if (error) throw error;
            toast.success('Record purged successfully.');
            router.push('/applications');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error('Deletion failed: ' + message);
        }
    };

    // ---------------------------------------------------------------------------
    // Loading / empty states
    // ---------------------------------------------------------------------------

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Accessing intelligence records...</p>
            </div>
        );
    }

    if (!application) return null;

    // ---------------------------------------------------------------------------
    // Derived values
    // ---------------------------------------------------------------------------

    const property = application.property ?? null;
    const propertyRent = property?.rent ?? 0;
    const propertyAddress = property?.address ?? 'Unknown Property';

    const monthlyIncome = application.monthly_income ?? 0;
    const combinedIncome = application.combined_household_income ?? monthlyIncome;
    const annualIncome = combinedIncome * 12;
    const annualIndividualIncome = monthlyIncome * 12;

    const incomeToRentRatio = propertyRent > 0 && monthlyIncome > 0
        ? monthlyIncome / propertyRent
        : null;

    const rentToIncomePercent = annualIncome > 0
        ? ((propertyRent * 12) / annualIncome) * 100
        : null;

    const dtiRatio = application.total_debt && annualIndividualIncome > 0
        ? (application.total_debt / annualIndividualIncome) * 100
        : null;

    // Risk assessment logic (uses rent-to-income percentage as the primary DTI signal)
    const rtiForRisk = rentToIncomePercent ?? (propertyRent > 0 && monthlyIncome > 0 ? (propertyRent / monthlyIncome) * 100 : 0);
    const riskAssessment = rtiForRisk > 40 || (application.credit_score !== undefined && application.credit_score < 620)
        ? { label: 'High Risk', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: AlertOctagon }
        : rtiForRisk > 30 || (application.credit_score !== undefined && application.credit_score < 680)
            ? { label: 'Moderate', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: Activity }
            : { label: 'Low / Optimal', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: CheckCircle2 };

    const creditScoreLabel = (score?: number): string => {
        if (!score) return '';
        if (score >= 750) return 'Excellent';
        if (score >= 700) return 'Good';
        if (score >= 650) return 'Fair';
        if (score >= 600) return 'Below Average';
        return 'Poor';
    };

    const creditScoreColor = (score?: number): string => {
        if (!score) return 'text-slate-400';
        if (score >= 700) return 'text-emerald-600';
        if (score >= 600) return 'text-amber-600';
        return 'text-red-600';
    };

    return (
        <div className="max-w-6xl mx-auto pb-20 space-y-8 animate-in fade-in duration-700">

            {/* Header Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/applications')}
                    className="rounded-xl gap-2 font-bold text-slate-500 hover:bg-slate-100 self-start"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowEditModal(true)}
                        variant="outline"
                        className="rounded-xl font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 text-xs sm:text-sm"
                    >
                        <Edit className="w-4 h-4 mr-1.5 sm:mr-2" /> Edit
                    </Button>
                    <Button
                        onClick={handleDelete}
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 rounded-xl text-xs sm:text-sm"
                    >
                        <Trash2 className="w-4 h-4 mr-1.5 sm:mr-2" /> Delete
                    </Button>
                </div>
            </div>

            {/* Main Identity Banner */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-2xl p-8 md:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] bg-slate-900 text-white flex items-center justify-center text-4xl font-black shadow-2xl border-8 border-slate-50 ring-1 ring-slate-200 shrink-0">
                            {application.applicant_name?.charAt(0) ?? '?'}
                        </div>
                        <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <h1 className="text-4xl font-black tracking-tighter text-slate-900 break-words">{application.applicant_name}</h1>
                                <Badge className={cn(
                                    'px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border w-fit',
                                    application.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        application.status === 'denied' ? 'bg-red-50 text-red-600 border-red-100' :
                                            'bg-amber-50 text-amber-600 border-amber-100'
                                )}>
                                    {application.status}
                                </Badge>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-slate-400 font-bold">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4" /> {propertyAddress}
                                </div>
                                <span className="hidden sm:inline">•</span>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" /> Applied {new Date(application.created_at).toLocaleDateString()}
                                </div>
                                {application.move_in_date && (
                                    <>
                                        <span className="hidden sm:inline">•</span>
                                        <div className="flex items-center gap-1.5">
                                            <Home className="w-4 h-4" /> Move-in {new Date(application.move_in_date).toLocaleDateString()}
                                        </div>
                                    </>
                                )}
                            </div>
                            {!property && (
                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg w-fit text-xs font-bold border border-amber-100">
                                    <AlertTriangle className="w-4 h-4" /> Property record not found
                                </div>
                            )}
                            {application.status === 'denied' && application.denial_reason && (
                                <div className="flex items-start gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg w-fit text-xs font-bold border border-red-100 max-w-md">
                                    <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>Denial reason: {application.denial_reason}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <Button
                            disabled={isUpdating || application.status === 'denied'}
                            onClick={() => handleStatusUpdate('denied')}
                            className="bg-slate-100 hover:bg-red-50 text-slate-900 hover:text-red-700 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest border-none transition-all active:scale-95 px-6 flex-1 sm:flex-none"
                        >
                            <XCircle className="w-5 h-5 mr-3" /> Deny
                        </Button>
                        <Button
                            disabled={isUpdating || application.status === 'approved'}
                            onClick={() => handleStatusUpdate('approved')}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-14 px-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95 flex-1 sm:flex-none"
                        >
                            <CheckCircle2 className="w-5 h-5 mr-3" /> Approve Record
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main body: left column + right sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ================================================================
                    LEFT COLUMN
                ================================================================ */}
                <div className="lg:col-span-2 space-y-8">

                    {/* ---- METRICS GRID ---------------------------------------- */}
                    <Card className="rounded-[2.5rem] border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
                        <CardHeader className="p-8 pb-6 border-b border-slate-50 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                    <ShieldCheck className="w-8 h-8 text-blue-600" /> Financial Intelligence
                                </CardTitle>
                                <CardDescription className="text-slate-400 font-medium mt-1">
                                    Income, credit, and affordability metrics
                                </CardDescription>
                            </div>
                            <Badge className="bg-slate-900 text-[10px] font-black tracking-widest px-3 py-1 uppercase hidden sm:inline-flex">
                                Live Data
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">

                            {/* Row 1: Credit Score + Income-to-Rent + Rent-to-Income */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Credit Score */}
                                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center hover:bg-white hover:shadow-xl transition-all duration-300">
                                    <TrendingUp className="w-6 h-6 text-indigo-500 mb-3" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Credit Score</p>
                                    <p className={cn('text-5xl font-black tracking-tighter tabular-nums leading-none', creditScoreColor(application.credit_score))}>
                                        {application.credit_score ?? 'N/A'}
                                    </p>
                                    {application.credit_score && (
                                        <p className={cn('text-[10px] font-black uppercase tracking-widest mt-2', creditScoreColor(application.credit_score))}>
                                            {creditScoreLabel(application.credit_score)}
                                        </p>
                                    )}
                                </div>

                                {/* Income-to-Rent Ratio */}
                                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center hover:bg-white hover:shadow-xl transition-all duration-300">
                                    <DollarSign className="w-6 h-6 text-emerald-500 mb-3" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Income-to-Rent</p>
                                    <p className={cn(
                                        'text-5xl font-black tracking-tighter tabular-nums leading-none',
                                        incomeToRentRatio === null ? 'text-slate-300' :
                                            incomeToRentRatio >= 3 ? 'text-emerald-600' :
                                                incomeToRentRatio >= 2 ? 'text-amber-600' : 'text-red-600'
                                    )}>
                                        {incomeToRentRatio !== null ? `${incomeToRentRatio.toFixed(1)}x` : 'N/A'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Monthly Income / Rent</p>
                                </div>

                                {/* Rent-to-Income % */}
                                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center hover:bg-white hover:shadow-xl transition-all duration-300">
                                    <Activity className="w-6 h-6 text-blue-500 mb-3" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Rent-to-Income</p>
                                    <p className={cn(
                                        'text-5xl font-black tracking-tighter tabular-nums leading-none',
                                        rentToIncomePercent === null ? 'text-slate-300' :
                                            rentToIncomePercent > 40 ? 'text-red-600' :
                                                rentToIncomePercent > 30 ? 'text-amber-600' : 'text-emerald-600'
                                    )}>
                                        {rentToIncomePercent !== null ? `${Math.round(rentToIncomePercent)}%` : 'N/A'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Annual Rent / Income</p>
                                </div>
                            </div>

                            {/* Row 2: Household Income + Total Debt + DTI */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Combined Household Income */}
                                <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-300">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Household Income</p>
                                    <p className="text-2xl font-black text-slate-900 tabular-nums">
                                        {combinedIncome > 0 ? formatCurrency(combinedIncome) : 'N/A'}
                                        <span className="text-xs font-bold text-slate-400 ml-1">/mo</span>
                                    </p>
                                    {annualIncome > 0 && (
                                        <p className="text-xs font-bold text-slate-400 mt-1">
                                            {formatCurrency(annualIncome)} / year
                                        </p>
                                    )}
                                </div>

                                {/* Total Debt */}
                                <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-300">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Total Debt</p>
                                    <p className={cn(
                                        'text-2xl font-black tabular-nums',
                                        application.total_debt ? 'text-slate-900' : 'text-slate-300'
                                    )}>
                                        {application.total_debt ? formatCurrency(application.total_debt) : 'N/A'}
                                    </p>
                                    {application.total_debt && (
                                        <p className="text-xs font-bold text-slate-400 mt-1">Outstanding obligations</p>
                                    )}
                                </div>

                                {/* DTI Ratio */}
                                <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-300">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">DTI Ratio</p>
                                    <p className={cn(
                                        'text-2xl font-black tabular-nums',
                                        dtiRatio === null ? 'text-slate-300' :
                                            dtiRatio > 43 ? 'text-red-600' :
                                                dtiRatio > 36 ? 'text-amber-600' : 'text-emerald-600'
                                    )}>
                                        {dtiRatio !== null ? `${Math.round(dtiRatio)}%` : 'N/A'}
                                    </p>
                                    <p className="text-xs font-bold text-slate-400 mt-1">Debt / Annual Income</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ---- CHECK STATUS GRID ----------------------------------- */}
                    <Card className="rounded-[2.5rem] border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
                        <CardHeader className="p-8 pb-6 border-b border-slate-50">
                            <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                                <CheckCircle2 className="w-6 h-6 text-blue-600" /> Verification Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <CheckItem
                                    label="Criminal Record"
                                    status={application.criminal_check_passed}
                                    passLabel="Clear"
                                    failLabel="Flag Found"
                                />
                                <CheckItem
                                    label="Background Check"
                                    status={application.background_check_passed}
                                    passLabel="Passed"
                                    failLabel="Failed"
                                />
                                <CheckItem
                                    label="Public Records"
                                    status={application.public_records_clear}
                                    passLabel="Clear"
                                    failLabel="Records Found"
                                />
                                <CheckItem
                                    label="Income Verified"
                                    status={application.income_verified}
                                    passLabel="Verified"
                                    failLabel="Unverified"
                                />
                                <CheckItem
                                    label="ID Verified"
                                    status={application.government_id_verified}
                                    passLabel="Verified"
                                    failLabel="Not Verified"
                                />
                                {/* Smoker — special amber treatment */}
                                <div className="flex flex-col items-center justify-center gap-2 p-5 rounded-3xl border border-slate-100 bg-slate-50/50 text-center">
                                    {application.is_smoker === undefined || application.is_smoker === null ? (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                                                <CigaretteOff className="w-5 h-5 text-slate-300" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Is Smoker</p>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 bg-slate-100 px-2 py-0.5 rounded-full">Unknown</span>
                                        </>
                                    ) : application.is_smoker ? (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                                                <Cigarette className="w-5 h-5 text-amber-500" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Is Smoker</p>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Smoker</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                                                <CigaretteOff className="w-5 h-5 text-emerald-500" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Is Smoker</p>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Non-Smoker</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ---- PROFESSIONAL + LIFESTYLE CARDS ---------------------- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Professional Data */}
                        <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white">
                            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-blue-600" /> Professional Data
                            </h3>
                            <div className="space-y-4">
                                <DetailItem label="Employer" value={application.employer ?? 'Not provided'} />
                                <DetailItem label="Employment Status" value={application.employment_status ?? 'Not provided'} />
                                <DetailItem label="Employment Duration" value={application.employment_duration ?? 'Not provided'} />
                                <DetailItem
                                    label="Annual Income Est."
                                    value={annualIndividualIncome > 0 ? formatCurrency(annualIndividualIncome) : 'Not provided'}
                                />
                                {application.applicant_email && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Email</p>
                                        <a
                                            href={`mailto:${application.applicant_email}`}
                                            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
                                        >
                                            <Mail className="w-4 h-4 shrink-0" />
                                            {application.applicant_email}
                                        </a>
                                    </div>
                                )}
                                {application.applicant_phone && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Phone</p>
                                        <a
                                            href={`tel:${application.applicant_phone}`}
                                            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
                                        >
                                            <Phone className="w-4 h-4 shrink-0" />
                                            {application.applicant_phone}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Lifestyle Profile */}
                        <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white">
                            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                <User className="w-5 h-5 text-indigo-600" /> Lifestyle Profile
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 py-2 border-b border-slate-50">
                                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Occupants</p>
                                        <p className="text-sm font-bold text-slate-900">{application.num_occupants ?? 1} Person(s)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 py-2 border-b border-slate-50">
                                    <PawPrint className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pets</p>
                                        <p className="text-sm font-bold text-slate-900">
                                            {application.has_pets
                                                ? `Yes${application.pet_details ? ` — ${application.pet_details}` : ''}`
                                                : 'No Pets'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 py-2 border-b border-slate-50">
                                    <Car className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicles</p>
                                        <p className="text-sm font-bold text-slate-900">
                                            {application.num_vehicles !== undefined && application.num_vehicles !== null
                                                ? `${application.num_vehicles} Vehicle(s)`
                                                : 'Not provided'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 py-2 border-b border-slate-50">
                                    {application.is_smoker
                                        ? <Cigarette className="w-4 h-4 text-amber-500 shrink-0" />
                                        : <CigaretteOff className="w-4 h-4 text-slate-400 shrink-0" />}
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Smoking Status</p>
                                        <p className="text-sm font-bold text-slate-900">
                                            {application.is_smoker === undefined || application.is_smoker === null
                                                ? 'Not disclosed'
                                                : application.is_smoker ? 'Smoker' : 'Non-smoker'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 py-2 border-b border-slate-50">
                                    <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Rent</p>
                                        <p className="text-sm font-bold text-slate-900">
                                            {application.current_rent ? formatCurrency(application.current_rent) + '/mo' : 'Not provided'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 py-2">
                                    <Home className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Landlord</p>
                                        {application.current_landlord_name ? (
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{application.current_landlord_name}</p>
                                                {application.current_landlord_phone && (
                                                    <a
                                                        href={`tel:${application.current_landlord_phone}`}
                                                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline mt-0.5"
                                                    >
                                                        <Phone className="w-3 h-3" />
                                                        {application.current_landlord_phone}
                                                    </a>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm font-bold text-slate-900">Not provided</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Notes (if any) */}
                    {application.notes && (
                        <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white">
                            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-slate-400" /> Internal Notes
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">{application.notes}</p>
                        </Card>
                    )}

                    {/* Review metadata (if reviewed) */}
                    {application.reviewed_at && (
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-400 px-2">
                            <Clock className="w-4 h-4 shrink-0" />
                            Reviewed {new Date(application.reviewed_at).toLocaleString()}
                            {application.reviewed_by && ` by ${application.reviewed_by}`}
                        </div>
                    )}
                </div>

                {/* ================================================================
                    RIGHT SIDEBAR
                ================================================================ */}
                <div className="space-y-8">

                    {/* Screening Report Upload (SingleKey, Certn, Equifax, or any provider) */}
                    <ScreeningReportUpload
                        applicationId={application.id}
                        onReportProcessed={() => fetchApplication()}
                    />

                    {/* Application Documents */}
                    <ApplicationDocuments applicationId={application.id} />

                    {/* Document Forge */}
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
                                <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-indigo-900/40 border border-indigo-500/30 transition-all hover:scale-[1.02] active:scale-95">
                                    <Sparkles className="w-4 h-4 mr-3 fill-indigo-200" /> Forge Applicant Summary
                                </Button>
                            </Link>
                        </div>
                    </Card>

                    {/* Risk Intelligence */}
                    <div className={cn('p-10 rounded-[2.5rem] border flex flex-col gap-8 transition-all duration-500', riskAssessment.bg, riskAssessment.border)}>
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center border border-slate-100">
                                <riskAssessment.icon className={cn('w-7 h-7', riskAssessment.color)} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Risk Intelligence</p>
                                <p className={cn('text-lg font-black tracking-tight', riskAssessment.color)}>{riskAssessment.label}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center border border-slate-100">
                                <DollarSign className="w-7 h-7 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Target Monthly Rent</p>
                                <p className="text-lg font-black text-slate-900 tracking-tight">
                                    {propertyRent > 0 ? `$${propertyRent.toLocaleString()}` : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <EditApplicationModal
                application={application}
                open={showEditModal}
                onOpenChange={(open) => {
                    setShowEditModal(open);
                    if (!open) fetchApplication();
                }}
            />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CheckItemProps {
    label: string;
    status: boolean | undefined | null;
    passLabel?: string;
    failLabel?: string;
}

function CheckItem({ label, status, passLabel = 'Passed', failLabel = 'Failed' }: CheckItemProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 p-5 rounded-3xl border border-slate-100 bg-slate-50/50 text-center">
            {status === undefined || status === null ? (
                <>
                    <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 bg-slate-100 px-2 py-0.5 rounded-full">Pending</span>
                </>
            ) : status ? (
                <>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">{passLabel}</span>
                </>
            ) : (
                <>
                    <div className="w-10 h-10 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">{failLabel}</span>
                </>
            )}
        </div>
    );
}

function DetailItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className="text-sm font-bold tracking-tight text-slate-900">{value}</p>
        </div>
    );
}
