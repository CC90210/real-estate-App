'use client';

import { AlertTriangle, AlertCircle, Info, ShieldCheck, ShieldX, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { runVetting, VettingResult, VettingFlag } from '@/lib/vetting';

interface VettingScoreCardProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Supabase row shape
    application: any;
    propertyRent: number;
    className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): { text: string; bg: string; ring: string; track: string } {
    if (score >= 70) {
        return {
            text: 'text-emerald-600',
            bg: 'bg-emerald-50',
            ring: 'stroke-emerald-500',
            track: 'stroke-emerald-100',
        };
    }
    if (score >= 50) {
        return {
            text: 'text-amber-600',
            bg: 'bg-amber-50',
            ring: 'stroke-amber-500',
            track: 'stroke-amber-100',
        };
    }
    return {
        text: 'text-rose-600',
        bg: 'bg-rose-50',
        ring: 'stroke-rose-500',
        track: 'stroke-rose-100',
    };
}

function overallColors(overall: VettingResult['overall']) {
    switch (overall) {
        case 'pass':
            return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: ShieldCheck };
        case 'fail':
            return { badge: 'bg-rose-50 text-rose-700 border-rose-200', Icon: ShieldX };
        default:
            return { badge: 'bg-amber-50 text-amber-700 border-amber-200', Icon: ShieldAlert };
    }
}

function overallLabel(overall: VettingResult['overall']) {
    switch (overall) {
        case 'pass':
            return 'PASS';
        case 'fail':
            return 'FAIL';
        default:
            return 'NEEDS REVIEW';
    }
}

function flagIcon(type: VettingFlag['type']) {
    switch (type) {
        case 'critical':
            return <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />;
        case 'warning':
            return <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />;
        default:
            return <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />;
    }
}

function statusDot(status: string) {
    switch (status) {
        case 'pass':
            return 'bg-emerald-500';
        case 'fail':
            return 'bg-rose-500';
        default:
            return 'bg-amber-400';
    }
}

// ---------------------------------------------------------------------------
// Circular gauge via SVG — renders a progress arc
// ---------------------------------------------------------------------------
function ScoreGauge({ score, size = 80 }: { score: number; size?: number }) {
    const colors = scoreColor(score);
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.max(0, Math.min(1, score / 100));
    const dashOffset = circumference * (1 - progress);
    const center = size / 2;

    return (
        <svg width={size} height={size} className="-rotate-90">
            {/* Track */}
            <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                strokeWidth={6}
                className={colors.track}
            />
            {/* Progress arc */}
            <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className={cn(colors.ring, 'transition-all duration-700')}
            />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Breakdown bar row
// ---------------------------------------------------------------------------
function BreakdownRow({
    label,
    status,
    detail,
    maxPoints,
    points,
}: {
    label: string;
    status: string;
    detail: string;
    maxPoints: number;
    points: number;
}) {
    const pct = Math.round((points / maxPoints) * 100);

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={cn('h-1.5 w-1.5 rounded-full', statusDot(status))} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {label}
                    </span>
                </div>
                <span className="text-[10px] font-black text-slate-500 tabular-nums">{detail}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={cn(
                        'h-full rounded-full transition-all duration-700',
                        status === 'pass'
                            ? 'bg-emerald-500'
                            : status === 'fail'
                            ? 'bg-rose-500'
                            : 'bg-amber-400'
                    )}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function VettingScoreCard({ application, propertyRent, className }: VettingScoreCardProps) {
    const result = runVetting(application, propertyRent);
    const { score, overall, flags, breakdown } = result;
    const colors = scoreColor(score);
    const { badge, Icon } = overallColors(overall);

    // Partial point values mirroring the engine weights
    const incomePoints = Math.min(30, (breakdown.income.ratio / 4) * 30);
    const creditRange = 850 - 500;
    const creditPoints =
        breakdown.credit.score === null
            ? 0
            : Math.min(30, Math.max(0, ((breakdown.credit.score - 500) / creditRange) * 30));
    const backgroundPoints =
        breakdown.background.status === 'pass'
            ? 20
            : breakdown.background.status === 'pending'
            ? 10
            : 0;
    const verificationPoints =
        breakdown.income_verification.status === 'pass'
            ? 20
            : breakdown.income_verification.status === 'pending'
            ? 10
            : 0;

    return (
        <div
            className={cn(
                'rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-5',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Automated Vetting
                </span>
                <span
                    className={cn(
                        'inline-flex items-center gap-1.5 border rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest',
                        badge
                    )}
                >
                    <Icon className="h-3 w-3" />
                    {overallLabel(overall)}
                </span>
            </div>

            {/* Score gauge + breakdown */}
            <div className="flex items-start gap-6">
                {/* Gauge */}
                <div className={cn('relative h-20 w-20 shrink-0 rounded-2xl flex items-center justify-center', colors.bg)}>
                    <ScoreGauge score={score} size={72} />
                    <span
                        className={cn(
                            'absolute inset-0 flex items-center justify-center text-xl font-black tabular-nums',
                            colors.text
                        )}
                    >
                        {score}
                    </span>
                </div>

                {/* Breakdown bars */}
                <div className="flex-1 space-y-3 pt-1">
                    <BreakdownRow
                        label="Income"
                        status={breakdown.income.status}
                        detail={`${breakdown.income.ratio.toFixed(1)}x / ${breakdown.income.required}x req.`}
                        maxPoints={30}
                        points={incomePoints}
                    />
                    <BreakdownRow
                        label="Credit"
                        status={breakdown.credit.status}
                        detail={
                            breakdown.credit.score !== null
                                ? `${breakdown.credit.score} (min ${breakdown.credit.min})`
                                : 'Not on file'
                        }
                        maxPoints={30}
                        points={creditPoints}
                    />
                    <BreakdownRow
                        label="Background"
                        status={breakdown.background.status}
                        detail={
                            breakdown.background.status === 'pass'
                                ? 'Clear'
                                : breakdown.background.status === 'pending'
                                ? 'Pending'
                                : 'Failed'
                        }
                        maxPoints={20}
                        points={backgroundPoints}
                    />
                    <BreakdownRow
                        label="Income Verification"
                        status={breakdown.income_verification.status}
                        detail={
                            breakdown.income_verification.verified !== null
                                ? `$${breakdown.income_verification.verified.toLocaleString()} verified`
                                : 'Not verified'
                        }
                        maxPoints={20}
                        points={verificationPoints}
                    />
                </div>
            </div>

            {/* Flags */}
            {flags.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        Flags
                    </span>
                    <ul className="space-y-1.5">
                        {flags.map((flag) => (
                            <li key={flag.code} className="flex items-start gap-2">
                                {flagIcon(flag.type)}
                                <span className="text-xs font-medium text-slate-500 leading-snug">
                                    {flag.message}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
