'use client';

import { useState } from 'react';
import {
    Package,
    FileText,
    PenTool,
    CreditCard,
    Send,
    CheckCircle,
    Lock,
    Unlock,
    ChevronRight,
    User,
    MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DocumentSendDialog } from '@/components/documents/DocumentSendDialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentPackageBuilderProps {
    applicationId: string;
    applicantName: string;
    applicantEmail: string;
    propertyAddress: string;
    paymentReceived: boolean;
    className?: string;
}

// ─── Step definitions ─────────────────────────────────────────────────────────

interface Step {
    id: number;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
    gatedBy?: 'payment';
}

const STEPS: Step[] = [
    {
        id: 1,
        label: 'Select Documents',
        description: 'Choose the documents to include in the package',
        icon: FileText,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-200',
    },
    {
        id: 2,
        label: 'Configure E-Sign',
        description: 'Set up electronic signature routing',
        icon: PenTool,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
        borderColor: 'border-indigo-200',
    },
    {
        id: 3,
        label: 'Payment Gate',
        description: 'Confirm payment before lease release',
        icon: CreditCard,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-200',
        gatedBy: 'payment',
    },
    {
        id: 4,
        label: 'Send Package',
        description: 'Deliver documents to the applicant',
        icon: Send,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        borderColor: 'border-emerald-200',
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentPackageBuilder({
    applicationId,
    applicantName,
    applicantEmail,
    propertyAddress,
    paymentReceived,
    className,
}: DocumentPackageBuilderProps) {
    const [dialogOpen, setDialogOpen] = useState(false);

    // Determine which step is "current" based on payment gate state.
    // Steps 1 and 2 are always reachable; step 3 is the gate; step 4 unlocks after payment.
    const currentStep = paymentReceived ? 4 : 3;

    function getStepState(step: Step): 'completed' | 'current' | 'locked' | 'upcoming' {
        if (step.gatedBy === 'payment' && !paymentReceived) return 'current';
        if (step.id < currentStep) return 'completed';
        if (step.id === currentStep) return 'current';
        if (step.gatedBy === 'payment' && !paymentReceived && step.id > 3) return 'locked';
        return 'upcoming';
    }

    return (
        <>
            <Card className={cn(
                'rounded-2xl border-slate-100/50 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/30 overflow-hidden',
                className
            )}>
                <CardContent className="p-0">
                    {/* ── Header ── */}
                    <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <Package className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-black text-slate-900 text-base">Document Package</p>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Approved application flow</p>
                                </div>
                            </div>

                            {/* Payment gate badge */}
                            <div className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border',
                                paymentReceived
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                            )}>
                                {paymentReceived
                                    ? <Unlock className="h-3 w-3" />
                                    : <Lock className="h-3 w-3" />
                                }
                                {paymentReceived ? 'Payment Cleared' : 'Awaiting Payment'}
                            </div>
                        </div>

                        {/* Applicant and property context */}
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Applicant</p>
                                    <p className="text-xs font-bold text-slate-800 truncate">{applicantName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Property</p>
                                    <p className="text-xs font-bold text-slate-800 truncate">{propertyAddress}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Step flow ── */}
                    <div className="px-6 py-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Package Flow</p>
                        <div className="space-y-2">
                            {STEPS.map((step, index) => {
                                const state = getStepState(step);
                                const Icon = step.icon;
                                const isLast = index === STEPS.length - 1;

                                return (
                                    <div key={step.id} className="relative">
                                        <div className={cn(
                                            'flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200',
                                            state === 'completed'
                                                ? 'bg-emerald-50 border-emerald-200'
                                                : state === 'current' && step.gatedBy === 'payment'
                                                    ? 'bg-amber-50 border-amber-300 shadow-sm shadow-amber-100'
                                                    : state === 'current'
                                                        ? 'bg-blue-50 border-blue-200 shadow-sm shadow-blue-100'
                                                        : state === 'locked'
                                                            ? 'bg-slate-50 border-slate-100 opacity-60'
                                                            : 'bg-slate-50/50 border-slate-100 opacity-70'
                                        )}>
                                            {/* Step icon */}
                                            <div className={cn(
                                                'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                                                state === 'completed'
                                                    ? 'bg-emerald-500'
                                                    : state === 'current' && step.gatedBy === 'payment'
                                                        ? 'bg-amber-100'
                                                        : state === 'current'
                                                            ? step.bgColor
                                                            : 'bg-slate-100'
                                            )}>
                                                {state === 'completed'
                                                    ? <CheckCircle className="h-4 w-4 text-white" />
                                                    : state === 'locked'
                                                        ? <Lock className="h-4 w-4 text-slate-400" />
                                                        : <Icon className={cn(
                                                            'h-4 w-4',
                                                            state === 'current'
                                                                ? step.color
                                                                : 'text-slate-400'
                                                        )} />
                                                }
                                            </div>

                                            {/* Step text */}
                                            <div className="flex-1 min-w-0">
                                                <p className={cn(
                                                    'text-sm font-bold',
                                                    state === 'completed'
                                                        ? 'text-emerald-700'
                                                        : state === 'current' && step.gatedBy === 'payment'
                                                            ? 'text-amber-800'
                                                            : state === 'current'
                                                                ? 'text-slate-900'
                                                                : 'text-slate-500'
                                                )}>
                                                    {step.label}
                                                </p>
                                                <p className={cn(
                                                    'text-xs font-medium',
                                                    state === 'completed'
                                                        ? 'text-emerald-600'
                                                        : state === 'current' && step.gatedBy === 'payment'
                                                            ? 'text-amber-600'
                                                            : 'text-slate-400'
                                                )}>
                                                    {step.description}
                                                </p>
                                            </div>

                                            {/* Step number badge */}
                                            <div className={cn(
                                                'flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-black',
                                                state === 'completed'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : state === 'current'
                                                        ? 'bg-white text-slate-600 shadow-sm'
                                                        : 'text-slate-300'
                                            )}>
                                                {step.id}
                                            </div>
                                        </div>

                                        {/* Connector line between steps */}
                                        {!isLast && (
                                            <div className="ml-7 mt-0.5 mb-0.5 w-px h-2 bg-slate-200" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Action footer ── */}
                    <div className="px-6 pb-5">
                        <Button
                            onClick={() => setDialogOpen(true)}
                            className={cn(
                                'w-full h-12 rounded-xl font-black text-white border-0 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl',
                                paymentReceived
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-200'
                                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-200'
                            )}
                        >
                            <Package className="h-4 w-4 mr-2" />
                            Build Package
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                        {!paymentReceived && (
                            <p className="text-center text-[11px] text-amber-600 font-bold mt-2">
                                Mark payment as received to unlock the lease document
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <DocumentSendDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                applicationId={applicationId}
                recipientEmail={applicantEmail}
                recipientName={applicantName}
                paymentReceived={paymentReceived}
            />
        </>
    );
}
