'use client';

import { cn } from '@/lib/utils';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import {
    Home,
    ClipboardCheck,
    Megaphone,
    MessageSquare,
    ClipboardList,
    PenTool,
    CreditCard,
    KeyRound,
    CheckCircle,
    Lock,
    ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import type { RentalWorkflowPhase } from '@/types/database';

interface WorkflowTrackerProps {
    propertyId: string;
    currentPhase: RentalWorkflowPhase;
    inspectionStatus?: string;
    className?: string;
}

const PHASES = [
    { id: 'onboarding' as const, label: 'Property Setup', icon: Home, href: null },
    { id: 'inspection' as const, label: 'Inspection', icon: ClipboardCheck, href: '/inspections' },
    { id: 'listing' as const, label: 'Listed', icon: Megaphone, href: '/social' },
    { id: 'communication' as const, label: 'Leads', icon: MessageSquare, href: null },
    { id: 'application' as const, label: 'Applications', icon: ClipboardList, href: '/applications' },
    { id: 'documents' as const, label: 'Documents', icon: PenTool, href: '/documents' },
    { id: 'payment' as const, label: 'Payment', icon: CreditCard, href: '/invoices' },
    { id: 'handoff' as const, label: 'Key Handoff', icon: KeyRound, href: null },
] as const;

const PHASE_ORDER: Record<string, number> = {
    onboarding: 0,
    inspection: 1,
    listing: 2,
    communication: 3,
    application: 4,
    documents: 5,
    payment: 6,
    handoff: 7,
    occupied: 8,
};

export function WorkflowTracker({ propertyId, currentPhase, inspectionStatus, className }: WorkflowTrackerProps) {
    const { colors } = useAccentColor();
    const currentIndex = PHASE_ORDER[currentPhase] ?? 0;

    if (currentPhase === 'occupied') {
        return (
            <div className={cn("bg-emerald-50 border border-emerald-200 rounded-2xl p-6", className)}>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-emerald-800">Rental Complete</p>
                        <p className="text-sm text-emerald-600">This property has an active lease.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("bg-white rounded-2xl shadow-sm border border-slate-200 p-6", className)}>
            <div className="flex items-center gap-2 mb-5">
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Rental Workflow</h3>
            </div>

            <div className="space-y-1">
                {PHASES.map((phase, index) => {
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const isLocked = index > currentIndex;

                    return (
                        <div
                            key={phase.id}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm",
                                isCompleted && "text-emerald-700",
                                isCurrent && cn("font-bold", colors.bgLight, colors.text),
                                isLocked && "text-slate-300"
                            )}
                        >
                            {/* Step indicator */}
                            <div className={cn(
                                "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
                                isCompleted && "bg-emerald-100 text-emerald-600",
                                isCurrent && cn(colors.bg, "text-white"),
                                isLocked && "bg-slate-100 text-slate-300"
                            )}>
                                {isCompleted ? (
                                    <CheckCircle className="w-4 h-4" />
                                ) : isLocked ? (
                                    <Lock className="w-3 h-3" />
                                ) : (
                                    <phase.icon className="w-3.5 h-3.5" />
                                )}
                            </div>

                            {/* Label */}
                            <span className="flex-1">{phase.label}</span>

                            {/* Current phase badge */}
                            {isCurrent && (
                                <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", colors.bgLight, colors.text)}>
                                    Current
                                </span>
                            )}

                            {/* Link to relevant page */}
                            {(isCompleted || isCurrent) && phase.href && (
                                <Link href={phase.href} className={cn("text-xs font-bold hover:underline", isCompleted ? "text-emerald-500" : colors.text)}>
                                    View
                                </Link>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Gate info */}
            {currentPhase === 'onboarding' && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-xs text-amber-700 font-medium">
                        Complete property photos and video walkthrough to proceed to inspection.
                    </p>
                </div>
            )}
            {currentPhase === 'inspection' && inspectionStatus === 'failed' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-xs text-red-700 font-medium">
                        Inspection has failed items. Resolve issues or get landlord override to proceed to listing.
                    </p>
                </div>
            )}
        </div>
    );
}
