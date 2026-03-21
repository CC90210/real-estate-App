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
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAccentColor } from '@/lib/hooks/useAccentColor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface ScreeningMetrics {
    credit_score: number | null;
    criminal_clear: boolean | null;
    public_records_clear: boolean | null;
    annual_income: number | null;
    total_debt: number | null;
    bankruptcies: number | null;
    collections: number | null;
    risk_flags: string[];
    ai_summary: string | null;
}

interface ScreeningReport {
    id: string;
    file_name: string;
    file_size: number;
    status: ProcessingStatus;
    metrics: ScreeningMetrics | null;
    created_at: string;
    error_message: string | null;
}

interface ScreeningReportUploadProps {
    applicationId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- caller decides how to consume raw report data
    onReportProcessed?: (data: any) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
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
    if (amount === null) return '—';
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
        case 'completed':
            return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        case 'failed':
            return 'bg-rose-50 text-rose-700 border border-rose-200';
        case 'uploading':
        case 'processing':
            return 'bg-amber-50 text-amber-700 border border-amber-200';
        default:
            return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
}

function statusLabel(status: ProcessingStatus): string {
    switch (status) {
        case 'uploading':   return 'Uploading';
        case 'processing':  return 'Processing';
        case 'completed':   return 'Completed';
        case 'failed':      return 'Failed';
        default:            return 'Pending';
    }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({
    label,
    children,
    className,
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('rounded-2xl border bg-white p-4 flex flex-col gap-1.5', className)}>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
            {children}
        </div>
    );
}

function BooleanMetric({ value }: { value: boolean | null }) {
    if (value === null) {
        return <span className="text-sm font-bold text-slate-400">—</span>;
    }
    return value ? (
        <span className="flex items-center gap-1.5 text-sm font-black text-emerald-700">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Clear
        </span>
    ) : (
        <span className="flex items-center gap-1.5 text-sm font-black text-rose-700">
            <XCircle className="h-4 w-4 shrink-0" />
            Not Clear
        </span>
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
    // Ref used to cancel polling when component unmounts
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ---------------------------------------------------------------------------
    // Fetch existing reports on mount
    // ---------------------------------------------------------------------------
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

    // ---------------------------------------------------------------------------
    // File validation
    // ---------------------------------------------------------------------------
    const validateFile = (file: File): string | null => {
        if (file.type !== ACCEPTED_MIME) {
            return 'Only PDF files are accepted.';
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            return `File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE_BYTES)}.`;
        }
        return null;
    };

    // ---------------------------------------------------------------------------
    // Upload handler (XHR for progress events)
    // ---------------------------------------------------------------------------
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
                        resolve();
                    } else {
                        let message = 'Upload failed';
                        try {
                            const body = JSON.parse(xhr.responseText) as { error?: string };
                            if (body.error) message = body.error;
                        } catch {
                            // leave default message
                        }
                        reject(new Error(message));
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
                xhr.addEventListener('abort', () => reject(new Error('Upload was cancelled')));

                xhr.open('POST', `/api/applications/${applicationId}/screening-report`);
                xhr.send(formData);
            }).then(() => {
                setUploadProgress(100);
                setUploadStatus('processing');
                toast.success('Report uploaded', { description: 'AI analysis is in progress…' });
                startPolling();
            }).catch((err: Error) => {
                setUploadStatus('failed');
                toast.error('Upload failed', { description: err.message });
            });
        },
        // validateFile is a pure function defined in module scope — stable reference
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [applicationId]
    );

    // ---------------------------------------------------------------------------
    // Poll until the latest report transitions out of 'processing'
    // ---------------------------------------------------------------------------
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
                    toast.success('Analysis complete', { description: 'SingleKey screening metrics are ready.' });
                    if (onReportProcessed) onReportProcessed(newest);
                } else if (newest.status === 'failed') {
                    setUploadStatus('failed');
                    clearInterval(pollIntervalRef.current!);
                    toast.error('Processing failed', {
                        description: newest.error_message ?? 'The report could not be analysed.',
                    });
                }
            } catch {
                // silently retry on the next tick
            }
        }, 3000);
    }, [applicationId, onReportProcessed]);

    // ---------------------------------------------------------------------------
    // Drag-and-drop handlers
    // ---------------------------------------------------------------------------
    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        // Only leave when the cursor actually exits the drop zone (not a child element)
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setIsDragOver(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);

            const file = e.dataTransfer.files?.[0];
            if (file) uploadFile(file);
        },
        [uploadFile]
    );

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
            // reset so the same file can be re-selected after a failure
            e.target.value = '';
        },
        [uploadFile]
    );

    // ---------------------------------------------------------------------------
    // Derived state
    // ---------------------------------------------------------------------------
    const isActive = uploadStatus === 'uploading' || uploadStatus === 'processing';
    const metrics = latestReport?.metrics ?? null;
    const showResults = latestReport?.status === 'completed' && metrics !== null;
    const creditColors = creditScoreColor(metrics?.credit_score ?? null);

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
        <div className="space-y-5">
            {/* ----------------------------------------------------------------
                Card header
            ---------------------------------------------------------------- */}
            <Card className="rounded-[2rem] bg-white shadow-xl border-none p-0 gap-0">
                <CardHeader className="p-6 pb-0">
                    <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                        <Shield className={cn('w-5 h-5', colors.text)} />
                        SingleKey Screening Report
                    </CardTitle>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                        Upload a SingleKey PDF report to extract AI-verified screening metrics.
                    </p>
                </CardHeader>

                <CardContent className="p-6 space-y-5">
                    {/* ------------------------------------------------------------
                        Drop zone — hidden when an upload is active
                    ------------------------------------------------------------ */}
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
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                                }}
                                className={cn(
                                    'flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed',
                                    'py-12 px-6 cursor-pointer select-none transition-colors duration-150',
                                    isDragOver
                                        ? `border-current ${colors.text} ${colors.bgLight}`
                                        : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100/70'
                                )}
                            >
                                <div
                                    className={cn(
                                        'h-14 w-14 rounded-2xl flex items-center justify-center transition-colors duration-150',
                                        isDragOver ? `${colors.bgLight}` : 'bg-white shadow-sm'
                                    )}
                                >
                                    <Upload
                                        className={cn(
                                            'h-6 w-6 transition-colors duration-150',
                                            isDragOver ? colors.text : 'text-slate-400'
                                        )}
                                    />
                                </div>

                                <div className="text-center">
                                    <p className="text-sm font-black text-slate-700">
                                        Drop SingleKey Report or{' '}
                                        <span className={cn('underline underline-offset-2', colors.text)}>
                                            click to upload
                                        </span>
                                    </p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                                        PDF only · max 20 MB
                                    </p>
                                </div>

                                {selectedFile && uploadStatus === 'failed' && (
                                    <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-100 px-4 py-2 shadow-sm">
                                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                {formatFileSize(selectedFile.size)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleFileInputChange}
                                className="hidden"
                                aria-hidden="true"
                            />
                        </>
                    )}

                    {/* ------------------------------------------------------------
                        Upload / processing progress
                    ------------------------------------------------------------ */}
                    {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                        <FileText className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">
                                            {selectedFile?.name ?? 'Report'}
                                        </p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {selectedFile ? formatFileSize(selectedFile.size) : ''}
                                        </p>
                                    </div>
                                </div>
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest',
                                        statusBadgeClass(uploadStatus)
                                    )}
                                >
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    {statusLabel(uploadStatus)}
                                </span>
                            </div>

                            {uploadStatus === 'uploading' ? (
                                <div className="space-y-1.5">
                                    <div className="flex justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            Uploading
                                        </span>
                                        <span className="text-[10px] font-black tabular-nums text-slate-500">
                                            {uploadProgress}%
                                        </span>
                                    </div>
                                    <Progress
                                        value={uploadProgress}
                                        className="h-2 bg-slate-200"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            AI analysis in progress
                                        </span>
                                    </div>
                                    {/* Indeterminate shimmer bar */}
                                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                                        <div className="h-full rounded-full bg-amber-400 animate-[shimmer_1.5s_ease-in-out_infinite] w-1/2" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ------------------------------------------------------------
                        Failed state — retry prompt
                    ------------------------------------------------------------ */}
                    {uploadStatus === 'failed' && (
                        <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4">
                            <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-rose-800">Upload failed</p>
                                <p className="text-[11px] text-rose-600 mt-0.5">
                                    {latestReport?.error_message ?? 'Please try again with a valid PDF.'}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-xl text-rose-700 hover:bg-rose-100 font-bold text-xs shrink-0"
                                onClick={() => {
                                    setUploadStatus('idle');
                                    setSelectedFile(null);
                                    setUploadProgress(0);
                                }}
                            >
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                Retry
                            </Button>
                        </div>
                    )}

                    {/* ------------------------------------------------------------
                        AI analysis results
                    ------------------------------------------------------------ */}
                    {showResults && metrics && (
                        <div className="space-y-5">
                            {/* Section label */}
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    AI Screening Analysis
                                </span>
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest',
                                        statusBadgeClass('completed')
                                    )}
                                >
                                    <ShieldCheck className="h-3 w-3" />
                                    Verified
                                </span>
                            </div>

                            {/* Metrics grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {/* Credit Score */}
                                <MetricCard
                                    label="Credit Score"
                                    className={cn('border', creditColors.border, creditColors.bg)}
                                >
                                    <div className="flex items-center gap-2">
                                        <CreditCard className={cn('h-4 w-4 shrink-0', creditColors.text)} />
                                        <span className={cn('text-2xl font-black tabular-nums leading-none', creditColors.text)}>
                                            {metrics.credit_score ?? '—'}
                                        </span>
                                    </div>
                                    {metrics.credit_score !== null && (
                                        <span className={cn('text-[10px] font-black uppercase tracking-widest', creditColors.text)}>
                                            {metrics.credit_score >= 700
                                                ? 'Good'
                                                : metrics.credit_score >= 600
                                                ? 'Fair'
                                                : 'Poor'}
                                        </span>
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
                                        <DollarSign className="h-4 w-4 text-slate-400 shrink-0" />
                                        <span className="text-base font-black text-slate-800 tabular-nums">
                                            {formatCurrency(metrics.annual_income)}
                                        </span>
                                    </div>
                                </MetricCard>

                                {/* Total Debt */}
                                <MetricCard label="Total Debt" className="border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                        <TrendingUp className="h-4 w-4 text-slate-400 shrink-0" />
                                        <span className="text-base font-black text-slate-800 tabular-nums">
                                            {formatCurrency(metrics.total_debt)}
                                        </span>
                                    </div>
                                </MetricCard>

                                {/* Bankruptcies */}
                                <MetricCard
                                    label="Bankruptcies"
                                    className={cn(
                                        'border',
                                        metrics.bankruptcies !== null && metrics.bankruptcies > 0
                                            ? 'border-rose-100 bg-rose-50'
                                            : 'border-slate-100'
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'text-2xl font-black tabular-nums leading-none',
                                            metrics.bankruptcies !== null && metrics.bankruptcies > 0
                                                ? 'text-rose-700'
                                                : 'text-slate-800'
                                        )}
                                    >
                                        {metrics.bankruptcies ?? '—'}
                                    </span>
                                </MetricCard>

                                {/* Collections */}
                                <MetricCard
                                    label="Collections"
                                    className={cn(
                                        'border',
                                        metrics.collections !== null && metrics.collections > 0
                                            ? 'border-amber-100 bg-amber-50'
                                            : 'border-slate-100'
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'text-2xl font-black tabular-nums leading-none',
                                            metrics.collections !== null && metrics.collections > 0
                                                ? 'text-amber-700'
                                                : 'text-slate-800'
                                        )}
                                    >
                                        {metrics.collections ?? '—'}
                                    </span>
                                </MetricCard>
                            </div>

                            {/* Risk flags */}
                            {metrics.risk_flags.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Risk Flags
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {metrics.risk_flags.map((flag, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800"
                                            >
                                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                                {flag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AI Summary */}
                            {metrics.ai_summary && (
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="h-4 w-4 text-slate-400 shrink-0" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            AI Summary
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">{metrics.ai_summary}</p>
                                </div>
                            )}

                            {/* Re-upload option */}
                            <div className="flex justify-end pt-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-bold text-xs"
                                    onClick={() => {
                                        setUploadStatus('idle');
                                        setSelectedFile(null);
                                        setUploadProgress(0);
                                    }}
                                >
                                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                                    Upload New Report
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ------------------------------------------------------------------
                Report history
            ------------------------------------------------------------------ */}
            {(isLoadingHistory || reportHistory.length > 0) && (
                <Card className="rounded-[2rem] bg-white shadow-xl border-none p-0 gap-0">
                    <CardHeader className="p-6 pb-0">
                        <CardTitle className="text-base font-black text-slate-900">
                            Report History
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {isLoadingHistory ? (
                            <div className="space-y-3">
                                {[1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className="h-16 rounded-2xl bg-slate-50 animate-pulse"
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {reportHistory.map((report) => (
                                    <div
                                        key={report.id}
                                        className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100/50 px-4 py-3 gap-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-9 w-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                                                <FileText className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-800 truncate">
                                                    {report.file_name}
                                                </p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    {formatFileSize(report.file_size)} &middot;{' '}
                                                    {new Date(report.created_at).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shrink-0',
                                                statusBadgeClass(report.status)
                                            )}
                                        >
                                            {report.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                                            {report.status === 'failed' && <XCircle className="h-3 w-3" />}
                                            {(report.status === 'uploading' || report.status === 'processing') && (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            )}
                                            {statusLabel(report.status)}
                                        </span>
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
