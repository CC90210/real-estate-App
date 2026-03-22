'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    Upload,
    FileText,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Loader2,
    Shield,
    ShieldCheck,
    ShieldAlert,
    TrendingUp,
    DollarSign,
    CreditCard,
    RefreshCw,
    Briefcase,
    Home,
    Scale,
    Eye,
    ChevronDown,
    ChevronUp,
    Download,
    ExternalLink,
    UserCheck,
    Building,
    Gavel,
    Ban,
    Landmark,
    History,
    Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAccentColor } from '@/lib/hooks/useAccentColor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface ScreeningMetrics {
    // Core
    credit_score: number | null;
    criminal_clear: boolean | null;
    public_records_clear: boolean | null;
    annual_income: number | null;
    total_debt: number | null;
    monthly_debt_payments: number | null;
    debt_to_income_ratio: number | null;
    bankruptcies: number | null;
    collections: number | null;
    legal_cases: number | null;
    judgments: number | null;
    liens: number | null;

    // Credit details
    credit_score_provider: string | null;
    credit_utilization_pct: number | null;
    credit_accounts_total: number | null;
    credit_accounts_delinquent: number | null;
    credit_inquiries_last_12mo: number | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trade_lines: any[];

    // Identity & verification
    id_verification_passed: boolean | null;
    address_verification_passed: boolean | null;
    sex_offender_check_clear: boolean | null;
    terrorist_watchlist_clear: boolean | null;

    // Employment
    employer_name: string | null;
    job_title: string | null;
    employment_status: string | null;
    employment_duration: string | null;
    employment_verified: boolean | null;
    income_verified: boolean | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    income_sources: any[];

    // Rental history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rental_history: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eviction_records: any[];
    current_rent: number | null;
    current_landlord_name: string | null;

    // Criminal details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    criminal_records: any[];

    // Collections & legal details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection_details: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    legal_case_details: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bankruptcy_details: any[];

    // Bank statement summary
    bank_statements_summary: {
        avg_monthly_balance: number;
        avg_monthly_deposits: number;
        avg_monthly_withdrawals: number;
        nsf_count: number;
        months_analyzed: number;
    } | null;

    // References
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    references: any[];

    // Report metadata
    report_provider: string | null;
    report_date: string | null;

    // Risk & summary
    risk_score: number | null;
    risk_level: string | null;
    risk_flags: string[];
    positive_indicators: string[];
    ai_summary: string | null;
    overall_recommendation: string | null;
}

interface ScreeningReport {
    id: string;
    file_name: string;
    file_url: string;
    file_size: number;
    report_type: string;
    status: ProcessingStatus;
    metrics: ScreeningMetrics | null;
    created_at: string;
    error_message: string | null;
}

interface ScreeningReportUploadProps {
    applicationId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onReportProcessed?: (data: any) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_MIME = 'application/pdf';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurrency(amount: number | null): string {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function creditScoreColor(score: number | null): { text: string; bg: string; border: string } {
    if (score === null) return { text: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100' };
    if (score >= 700) return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' };
    if (score >= 600) return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' };
    return { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' };
}

function statusBadgeClass(status: ProcessingStatus): string {
    switch (status) {
        case 'completed': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        case 'failed': return 'bg-rose-50 text-rose-700 border border-rose-200';
        case 'uploading':
        case 'processing': return 'bg-amber-50 text-amber-700 border border-amber-200';
        default: return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
}

function statusLabel(status: ProcessingStatus): string {
    switch (status) {
        case 'uploading': return 'Uploading';
        case 'processing': return 'Processing';
        case 'completed': return 'Completed';
        case 'failed': return 'Failed';
        default: return 'Pending';
    }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('rounded-2xl border bg-white p-3.5 flex flex-col gap-1', className)}>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
            {children}
        </div>
    );
}

function BooleanMetric({ value, passLabel = 'Clear', failLabel = 'Not Clear' }: { value: boolean | null; passLabel?: string; failLabel?: string }) {
    if (value === null || value === undefined) {
        return <span className="text-xs font-bold text-slate-400">—</span>;
    }
    return value ? (
        <span className="flex items-center gap-1.5 text-xs font-black text-emerald-700">
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            {passLabel}
        </span>
    ) : (
        <span className="flex items-center gap-1.5 text-xs font-black text-rose-700">
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            {failLabel}
        </span>
    );
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="rounded-xl border border-slate-100 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</span>
                </div>
                {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
            </button>
            {isOpen && <div className="p-4 space-y-3">{children}</div>}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ScreeningReportUpload({ applicationId, onReportProcessed }: ScreeningReportUploadProps) {
    const { colors } = useAccentColor();

    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<ProcessingStatus>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [latestReport, setLatestReport] = useState<ScreeningReport | null>(null);
    const [reportHistory, setReportHistory] = useState<ScreeningReport[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch existing reports on mount
    const fetchReports = useCallback(async () => {
        try {
            const res = await fetch(`/api/applications/${applicationId}/screening-report`);
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? 'Failed to fetch reports');
            }
            const data: ScreeningReport[] = await res.json();
            setReportHistory(data);
            if (data.length > 0) {
                setLatestReport(data[0]);
                if (data[0].status === 'completed') {
                    setUploadStatus('completed');
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load reports';
            toast.error('Could not load screening reports', { description: message });
        } finally {
            setIsLoadingHistory(false);
        }
    }, [applicationId]);

    useEffect(() => {
        fetchReports();
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [fetchReports]);

    // File validation
    const validateFile = (file: File): string | null => {
        if (file.type !== ACCEPTED_MIME) return 'Only PDF files are accepted.';
        if (file.size > MAX_FILE_SIZE_BYTES) return `File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE_BYTES)}.`;
        return null;
    };

    // Upload handler
    const uploadFile = useCallback(
        async (file: File) => {
            const validationError = validateFile(file);
            if (validationError) {
                toast.error('Invalid file', { description: validationError });
                return;
            }

            setSelectedFile(file);
            setUploadStatus('uploading');
            setUploadProgress(0);

            const formData = new FormData();
            formData.append('file', file);

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        setUploadProgress(Math.round((e.loaded / e.total) * 100));
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const responseData = JSON.parse(xhr.responseText);
                            // If the response already has completed status, skip polling
                            if (responseData.status === 'completed') {
                                setUploadProgress(100);
                                setUploadStatus('completed');
                                setLatestReport(responseData);
                                setReportHistory(prev => [responseData, ...prev]);
                                toast.success('Report analyzed', { description: 'Screening metrics extracted successfully.' });
                                if (onReportProcessed) onReportProcessed(responseData);
                                resolve();
                                return;
                            }
                        } catch {
                            // Continue to polling
                        }
                        resolve();
                    } else {
                        let message = 'Upload failed';
                        try {
                            const body = JSON.parse(xhr.responseText) as { error?: string };
                            if (body.error) message = body.error;
                        } catch { /* leave default */ }
                        reject(new Error(message));
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
                xhr.addEventListener('abort', () => reject(new Error('Upload was cancelled')));

                xhr.open('POST', `/api/applications/${applicationId}/screening-report`);
                xhr.send(formData);
            }).then(() => {
                if (uploadStatus !== 'completed') {
                    setUploadProgress(100);
                    setUploadStatus('processing');
                    toast.success('Report uploaded', { description: 'AI analysis is in progress...' });
                    startPolling();
                }
            }).catch((err: Error) => {
                setUploadStatus('failed');
                toast.error('Upload failed', { description: err.message });
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [applicationId]
    );

    // Poll until the latest report transitions out of processing
    const startPolling = useCallback(() => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        pollIntervalRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/applications/${applicationId}/screening-report`);
                if (!res.ok) return;

                const data: ScreeningReport[] = await res.json();
                if (data.length === 0) return;

                const newest = data[0];
                setReportHistory(data);
                setLatestReport(newest);

                if (newest.status === 'completed') {
                    setUploadStatus('completed');
                    clearInterval(pollIntervalRef.current!);
                    toast.success('Analysis complete', { description: 'Screening metrics are ready.' });
                    if (onReportProcessed) onReportProcessed(newest);
                } else if (newest.status === 'failed') {
                    setUploadStatus('failed');
                    clearInterval(pollIntervalRef.current!);
                    toast.error('Processing failed', { description: newest.error_message ?? 'The report could not be analysed.' });
                }
            } catch { /* silently retry */ }
        }, 3000);
    }, [applicationId, onReportProcessed]);

    // Drag-and-drop handlers
    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setIsDragOver(false);
    }, []);
    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); }, []);
    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) uploadFile(file);
    }, [uploadFile]);
    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file);
        e.target.value = '';
    }, [uploadFile]);

    // Derived state
    const isActive = uploadStatus === 'uploading' || uploadStatus === 'processing';
    const metrics = latestReport?.metrics ?? null;
    const showResults = latestReport?.status === 'completed' && metrics !== null;
    const creditColors = creditScoreColor(metrics?.credit_score ?? null);

    return (
        <div className="space-y-5">
            {/* Main upload card */}
            <Card className="rounded-[2rem] bg-white shadow-xl border-none p-0 gap-0">
                <CardHeader className="p-6 pb-0">
                    <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                        <Shield className={cn('w-5 h-5', colors.text)} />
                        Screening Report
                    </CardTitle>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                        Upload a screening report PDF (SingleKey, Certn, Equifax, or any provider) for AI-powered data extraction.
                    </p>
                </CardHeader>

                <CardContent className="p-6 space-y-5">
                    {/* Drop zone */}
                    {!isActive && uploadStatus !== 'completed' && (
                        <>
                            <div
                                role="button"
                                tabIndex={0}
                                aria-label="Drop zone — click or drag a PDF to upload"
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                                className={cn(
                                    'flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed',
                                    'py-12 px-6 cursor-pointer select-none transition-colors duration-150',
                                    isDragOver
                                        ? `border-current ${colors.text} ${colors.bgLight}`
                                        : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100/70'
                                )}
                            >
                                <div className={cn('h-14 w-14 rounded-2xl flex items-center justify-center transition-colors duration-150', isDragOver ? colors.bgLight : 'bg-white shadow-sm')}>
                                    <Upload className={cn('h-6 w-6 transition-colors duration-150', isDragOver ? colors.text : 'text-slate-400')} />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-black text-slate-700">
                                        Drop Screening Report or{' '}
                                        <span className={cn('underline underline-offset-2', colors.text)}>click to upload</span>
                                    </p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                                        PDF only · max 25 MB · any provider
                                    </p>
                                </div>
                                {selectedFile && uploadStatus === 'failed' && (
                                    <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-100 px-4 py-2 shadow-sm">
                                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{selectedFile.name}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{formatFileSize(selectedFile.size)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileInputChange} className="hidden" aria-hidden="true" />
                        </>
                    )}

                    {/* Upload / processing progress */}
                    {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                        <FileText className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{selectedFile?.name ?? 'Report'}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{selectedFile ? formatFileSize(selectedFile.size) : ''}</p>
                                    </div>
                                </div>
                                <span className={cn('inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest', statusBadgeClass(uploadStatus))}>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    {statusLabel(uploadStatus)}
                                </span>
                            </div>
                            {uploadStatus === 'uploading' ? (
                                <div className="space-y-1.5">
                                    <div className="flex justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Uploading</span>
                                        <span className="text-[10px] font-black tabular-nums text-slate-500">{uploadProgress}%</span>
                                    </div>
                                    <Progress value={uploadProgress} className="h-2 bg-slate-200" />
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI analysis in progress</span>
                                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                                        <div className="h-full rounded-full bg-amber-400 animate-[shimmer_1.5s_ease-in-out_infinite] w-1/2" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Failed state */}
                    {uploadStatus === 'failed' && (
                        <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4">
                            <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-rose-800">Upload failed</p>
                                <p className="text-[11px] text-rose-600 mt-0.5">{latestReport?.error_message ?? 'Please try again with a valid PDF.'}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="rounded-xl text-rose-700 hover:bg-rose-100 font-bold text-xs shrink-0"
                                onClick={() => { setUploadStatus('idle'); setSelectedFile(null); setUploadProgress(0); }}
                            >
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                            </Button>
                        </div>
                    )}

                    {/* AI Analysis Results */}
                    {showResults && metrics && (
                        <div className="space-y-4">
                            {/* Header with provider badge */}
                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Screening Analysis</span>
                                    {metrics.report_provider && (
                                        <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border-slate-200">
                                            {metrics.report_provider}
                                        </Badge>
                                    )}
                                </div>
                                <span className={cn('inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest', statusBadgeClass('completed'))}>
                                    <ShieldCheck className="h-3 w-3" /> Verified
                                </span>
                            </div>

                            {/* View original report link */}
                            {latestReport?.file_url && (
                                <a
                                    href={latestReport.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" /> View Original Report PDF
                                </a>
                            )}

                            {/* Core metrics grid */}
                            <div className="grid grid-cols-2 gap-2.5">
                                {/* Credit Score */}
                                <MetricCard label="Credit Score" className={cn('border col-span-2', creditColors.border, creditColors.bg)}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CreditCard className={cn('h-4 w-4 shrink-0', creditColors.text)} />
                                            <span className={cn('text-3xl font-black tabular-nums leading-none', creditColors.text)}>
                                                {metrics.credit_score ?? '—'}
                                            </span>
                                        </div>
                                        {metrics.credit_score !== null && (
                                            <span className={cn('text-[10px] font-black uppercase tracking-widest', creditColors.text)}>
                                                {metrics.credit_score >= 750 ? 'Excellent' : metrics.credit_score >= 700 ? 'Good' : metrics.credit_score >= 600 ? 'Fair' : 'Poor'}
                                            </span>
                                        )}
                                    </div>
                                    {metrics.credit_score_provider && (
                                        <span className="text-[10px] font-bold text-slate-400">{metrics.credit_score_provider}</span>
                                    )}
                                </MetricCard>

                                {/* Criminal Check */}
                                <MetricCard label="Criminal Check" className="border-slate-100">
                                    <BooleanMetric value={metrics.criminal_clear} />
                                </MetricCard>

                                {/* Public Records */}
                                <MetricCard label="Public Records" className="border-slate-100">
                                    <BooleanMetric value={metrics.public_records_clear} />
                                </MetricCard>

                                {/* Annual Income */}
                                <MetricCard label="Annual Income" className="border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                        <DollarSign className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        <span className="text-sm font-black text-slate-800 tabular-nums">{formatCurrency(metrics.annual_income)}</span>
                                    </div>
                                    {metrics.income_verified !== null && (
                                        <BooleanMetric value={metrics.income_verified} passLabel="Verified" failLabel="Unverified" />
                                    )}
                                </MetricCard>

                                {/* Total Debt */}
                                <MetricCard label="Total Debt" className="border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                        <TrendingUp className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        <span className="text-sm font-black text-slate-800 tabular-nums">{formatCurrency(metrics.total_debt)}</span>
                                    </div>
                                    {metrics.debt_to_income_ratio !== null && (
                                        <span className="text-[10px] font-bold text-slate-400">DTI: {metrics.debt_to_income_ratio}%</span>
                                    )}
                                </MetricCard>

                                {/* Bankruptcies */}
                                <MetricCard label="Bankruptcies" className={cn('border', metrics.bankruptcies && metrics.bankruptcies > 0 ? 'border-rose-100 bg-rose-50' : 'border-slate-100')}>
                                    <span className={cn('text-xl font-black tabular-nums leading-none', metrics.bankruptcies && metrics.bankruptcies > 0 ? 'text-rose-700' : 'text-slate-800')}>
                                        {metrics.bankruptcies ?? '—'}
                                    </span>
                                </MetricCard>

                                {/* Collections */}
                                <MetricCard label="Collections" className={cn('border', metrics.collections && metrics.collections > 0 ? 'border-amber-100 bg-amber-50' : 'border-slate-100')}>
                                    <span className={cn('text-xl font-black tabular-nums leading-none', metrics.collections && metrics.collections > 0 ? 'text-amber-700' : 'text-slate-800')}>
                                        {metrics.collections ?? '—'}
                                    </span>
                                </MetricCard>

                                {/* Evictions */}
                                {metrics.eviction_records && metrics.eviction_records.length > 0 && (
                                    <MetricCard label="Evictions" className="border border-rose-100 bg-rose-50 col-span-2">
                                        <span className="text-xl font-black tabular-nums leading-none text-rose-700">{metrics.eviction_records.length}</span>
                                    </MetricCard>
                                )}
                            </div>

                            {/* Verification Checks */}
                            <CollapsibleSection title="Identity & Verification" icon={UserCheck} defaultOpen>
                                <div className="grid grid-cols-2 gap-2">
                                    <MetricCard label="ID Verification" className="border-slate-100">
                                        <BooleanMetric value={metrics.id_verification_passed} passLabel="Verified" failLabel="Failed" />
                                    </MetricCard>
                                    <MetricCard label="Address Match" className="border-slate-100">
                                        <BooleanMetric value={metrics.address_verification_passed} passLabel="Matched" failLabel="Mismatch" />
                                    </MetricCard>
                                    <MetricCard label="Sex Offender" className="border-slate-100">
                                        <BooleanMetric value={metrics.sex_offender_check_clear} />
                                    </MetricCard>
                                    <MetricCard label="Watchlist" className="border-slate-100">
                                        <BooleanMetric value={metrics.terrorist_watchlist_clear} />
                                    </MetricCard>
                                </div>
                            </CollapsibleSection>

                            {/* Credit Details */}
                            {(metrics.credit_utilization_pct !== null || metrics.credit_accounts_total !== null || (metrics.trade_lines && metrics.trade_lines.length > 0)) && (
                                <CollapsibleSection title="Credit Details" icon={CreditCard}>
                                    <div className="grid grid-cols-2 gap-2">
                                        {metrics.credit_utilization_pct !== null && (
                                            <MetricCard label="Utilization" className="border-slate-100">
                                                <span className={cn('text-sm font-black tabular-nums', metrics.credit_utilization_pct > 30 ? 'text-amber-700' : 'text-emerald-700')}>
                                                    {metrics.credit_utilization_pct}%
                                                </span>
                                            </MetricCard>
                                        )}
                                        {metrics.credit_accounts_total !== null && (
                                            <MetricCard label="Total Accounts" className="border-slate-100">
                                                <span className="text-sm font-black text-slate-800">{metrics.credit_accounts_total}</span>
                                            </MetricCard>
                                        )}
                                        {metrics.credit_accounts_delinquent !== null && metrics.credit_accounts_delinquent > 0 && (
                                            <MetricCard label="Delinquent" className="border-rose-100 bg-rose-50">
                                                <span className="text-sm font-black text-rose-700">{metrics.credit_accounts_delinquent}</span>
                                            </MetricCard>
                                        )}
                                        {metrics.credit_inquiries_last_12mo !== null && (
                                            <MetricCard label="Inquiries (12mo)" className="border-slate-100">
                                                <span className="text-sm font-black text-slate-800">{metrics.credit_inquiries_last_12mo}</span>
                                            </MetricCard>
                                        )}
                                    </div>
                                    {metrics.trade_lines && metrics.trade_lines.length > 0 && (
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trade Lines</p>
                                            <div className="space-y-1">
                                                {metrics.trade_lines.slice(0, 8).map((tl: { creditor?: string; type?: string; balance?: number; status?: string }, i: number) => (
                                                    <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                                                        <span className="font-bold text-slate-700 truncate max-w-[120px]">{tl.creditor || 'Unknown'}</span>
                                                        <div className="flex items-center gap-2 text-[10px]">
                                                            <span className="font-black uppercase tracking-widest text-slate-400">{tl.type || ''}</span>
                                                            <span className="font-black text-slate-600 tabular-nums">{tl.balance ? formatCurrency(tl.balance) : ''}</span>
                                                            <span className={cn('font-black uppercase tracking-widest', tl.status?.toLowerCase() === 'current' ? 'text-emerald-600' : 'text-amber-600')}>
                                                                {tl.status || ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {metrics.trade_lines.length > 8 && (
                                                    <p className="text-[10px] font-bold text-slate-400 text-center">+{metrics.trade_lines.length - 8} more accounts</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CollapsibleSection>
                            )}

                            {/* Employment */}
                            {(metrics.employer_name || metrics.employment_status) && (
                                <CollapsibleSection title="Employment" icon={Briefcase}>
                                    <div className="space-y-2">
                                        {metrics.employer_name && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Employer</span>
                                                <span className="text-xs font-bold text-slate-800">{metrics.employer_name}</span>
                                            </div>
                                        )}
                                        {metrics.job_title && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title</span>
                                                <span className="text-xs font-bold text-slate-800">{metrics.job_title}</span>
                                            </div>
                                        )}
                                        {metrics.employment_status && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
                                                <span className="text-xs font-bold text-slate-800">{metrics.employment_status}</span>
                                            </div>
                                        )}
                                        {metrics.employment_duration && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration</span>
                                                <span className="text-xs font-bold text-slate-800">{metrics.employment_duration}</span>
                                            </div>
                                        )}
                                        {metrics.employment_verified !== null && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verified</span>
                                                <BooleanMetric value={metrics.employment_verified} passLabel="Yes" failLabel="No" />
                                            </div>
                                        )}
                                    </div>
                                </CollapsibleSection>
                            )}

                            {/* Rental History */}
                            {metrics.rental_history && metrics.rental_history.length > 0 && (
                                <CollapsibleSection title="Rental History" icon={Home}>
                                    <div className="space-y-2">
                                        {metrics.rental_history.map((rh: { address?: string; duration?: string; rent_amount?: number; landlord_name?: string; payment_history?: string; reason_for_leaving?: string }, i: number) => (
                                            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5">
                                                <p className="text-xs font-bold text-slate-800">{rh.address || 'Unknown address'}</p>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                                                    {rh.duration && <span className="font-bold">{rh.duration}</span>}
                                                    {rh.rent_amount && <span className="font-bold">{formatCurrency(rh.rent_amount)}/mo</span>}
                                                    {rh.landlord_name && <span className="font-bold">Landlord: {rh.landlord_name}</span>}
                                                </div>
                                                {rh.payment_history && <p className="text-[10px] font-bold text-slate-400">{rh.payment_history}</p>}
                                                {rh.reason_for_leaving && <p className="text-[10px] font-bold text-slate-400">Reason: {rh.reason_for_leaving}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </CollapsibleSection>
                            )}

                            {/* Bank Statement Summary */}
                            {metrics.bank_statements_summary && (
                                <CollapsibleSection title="Bank Statement Analysis" icon={Building}>
                                    <div className="grid grid-cols-2 gap-2">
                                        <MetricCard label="Avg Balance" className="border-slate-100">
                                            <span className="text-sm font-black text-slate-800 tabular-nums">
                                                {formatCurrency(metrics.bank_statements_summary.avg_monthly_balance)}
                                            </span>
                                        </MetricCard>
                                        <MetricCard label="Avg Deposits" className="border-slate-100">
                                            <span className="text-sm font-black text-slate-800 tabular-nums">
                                                {formatCurrency(metrics.bank_statements_summary.avg_monthly_deposits)}
                                            </span>
                                        </MetricCard>
                                        {metrics.bank_statements_summary.nsf_count > 0 && (
                                            <MetricCard label="NSF / Bounced" className="border-rose-100 bg-rose-50">
                                                <span className="text-sm font-black text-rose-700">{metrics.bank_statements_summary.nsf_count}</span>
                                            </MetricCard>
                                        )}
                                        <MetricCard label="Months Analyzed" className="border-slate-100">
                                            <span className="text-sm font-black text-slate-800">{metrics.bank_statements_summary.months_analyzed}</span>
                                        </MetricCard>
                                    </div>
                                </CollapsibleSection>
                            )}

                            {/* Collection Details */}
                            {metrics.collection_details && metrics.collection_details.length > 0 && (
                                <CollapsibleSection title="Collection Details" icon={Ban}>
                                    <div className="space-y-1">
                                        {metrics.collection_details.map((cd: { creditor?: string; amount?: number; date?: string; status?: string }, i: number) => (
                                            <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
                                                <span className="font-bold text-amber-800 truncate max-w-[120px]">{cd.creditor || 'Unknown'}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-amber-700 tabular-nums">{cd.amount ? formatCurrency(cd.amount) : ''}</span>
                                                    <span className="text-[10px] font-bold text-amber-600">{cd.status || ''}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CollapsibleSection>
                            )}

                            {/* References */}
                            {metrics.references && metrics.references.length > 0 && (
                                <CollapsibleSection title="References" icon={UserCheck}>
                                    <div className="space-y-1.5">
                                        {metrics.references.map((ref: { name?: string; relationship?: string; phone?: string; verified?: boolean }, i: number) => (
                                            <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                                                <div>
                                                    <span className="font-bold text-slate-800">{ref.name || 'Unknown'}</span>
                                                    {ref.relationship && <span className="text-[10px] text-slate-400 ml-2">{ref.relationship}</span>}
                                                </div>
                                                {ref.verified !== undefined && (
                                                    <BooleanMetric value={ref.verified} passLabel="Verified" failLabel="Unverified" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CollapsibleSection>
                            )}

                            {/* Positive indicators */}
                            {metrics.positive_indicators && metrics.positive_indicators.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Positive Indicators</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {metrics.positive_indicators.map((indicator, index) => (
                                            <span key={index} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                                                <Star className="h-3 w-3 shrink-0 fill-emerald-300" />
                                                {indicator}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Risk flags */}
                            {metrics.risk_flags && metrics.risk_flags.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Risk Flags</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {metrics.risk_flags.map((flag, index) => (
                                            <span key={index} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                                {flag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Overall Recommendation */}
                            {metrics.overall_recommendation && (
                                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <Scale className="h-4 w-4 text-blue-500 shrink-0" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Recommendation</span>
                                    </div>
                                    <p className="text-sm font-bold text-blue-900">{metrics.overall_recommendation}</p>
                                </div>
                            )}

                            {/* AI Summary */}
                            {metrics.ai_summary && (
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="h-4 w-4 text-slate-400 shrink-0" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Summary</span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed">{metrics.ai_summary}</p>
                                </div>
                            )}

                            {/* Re-upload option */}
                            <div className="flex justify-end pt-1">
                                <Button variant="ghost" size="sm" className="rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-bold text-xs"
                                    onClick={() => { setUploadStatus('idle'); setSelectedFile(null); setUploadProgress(0); }}
                                >
                                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload New Report
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Report history */}
            {(isLoadingHistory || reportHistory.length > 0) && (
                <Card className="rounded-[2rem] bg-white shadow-xl border-none p-0 gap-0">
                    <CardHeader className="p-6 pb-0">
                        <CardTitle className="text-base font-black text-slate-900">Report History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {isLoadingHistory ? (
                            <div className="space-y-3">
                                {[1, 2].map((i) => (<div key={i} className="h-16 rounded-2xl bg-slate-50 animate-pulse" />))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {reportHistory.map((report) => (
                                    <div key={report.id} className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100/50 px-4 py-3 gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-9 w-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                                                <FileText className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-800 truncate">{report.file_name}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    {formatFileSize(report.file_size)} &middot;{' '}
                                                    {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    {report.report_type && report.report_type !== 'custom' && (
                                                        <> &middot; {report.report_type}</>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {report.file_url && (
                                                <Button variant="ghost" size="sm" asChild className="h-7 w-7 rounded-lg p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                                                    <a href={report.file_url} target="_blank" rel="noopener noreferrer">
                                                        <Download className="h-3.5 w-3.5" />
                                                    </a>
                                                </Button>
                                            )}
                                            <span className={cn('inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shrink-0', statusBadgeClass(report.status))}>
                                                {report.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                                                {report.status === 'failed' && <XCircle className="h-3 w-3" />}
                                                {(report.status === 'uploading' || report.status === 'processing') && <Loader2 className="h-3 w-3 animate-spin" />}
                                                {statusLabel(report.status)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
