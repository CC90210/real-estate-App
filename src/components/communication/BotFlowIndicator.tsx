'use client'

import { cn } from '@/lib/utils'
import { useAccentColor } from '@/lib/hooks/useAccentColor'
import { CheckCircle } from 'lucide-react'

const BOT_STEPS = [
    { label: 'Availability', shortLabel: 'Avail.' },
    { label: 'Video Sent', shortLabel: 'Video' },
    { label: 'Interested', shortLabel: 'Interest' },
    { label: 'Showing Booked', shortLabel: 'Showing' },
    { label: 'Applied', shortLabel: 'Applied' },
] as const

export interface BotFlowIndicatorProps {
    currentStep: number // 0 = not started, 1–5 = step completed up to this point
    className?: string
    compact?: boolean
}

export function BotFlowIndicator({ currentStep, className, compact = false }: BotFlowIndicatorProps) {
    const { colors } = useAccentColor()

    return (
        <div className={cn('flex items-center gap-0', className)}>
            {BOT_STEPS.map((step, index) => {
                const stepNumber = index + 1
                const isCompleted = currentStep >= stepNumber
                const isActive = currentStep === stepNumber - 1 && stepNumber === 1
                    ? false
                    : currentStep === stepNumber - 1

                return (
                    <div key={step.label} className="flex items-center">
                        {/* Step node */}
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={cn(
                                    'relative flex items-center justify-center rounded-full transition-all duration-300',
                                    compact ? 'h-5 w-5' : 'h-7 w-7',
                                    isCompleted
                                        ? cn('shadow-sm', colors.bg, 'text-white')
                                        : isActive
                                            ? cn('border-2 ring-2', colors.border, colors.bgLight)
                                            : 'bg-slate-100 border-2 border-slate-200 text-slate-300'
                                )}
                                title={step.label}
                            >
                                {isCompleted ? (
                                    <CheckCircle className={cn('text-white', compact ? 'h-3 w-3' : 'h-4 w-4')} />
                                ) : (
                                    <span className={cn(
                                        'font-black leading-none',
                                        compact ? 'text-[8px]' : 'text-[10px]',
                                        isActive ? colors.text : 'text-slate-300'
                                    )}>
                                        {stepNumber}
                                    </span>
                                )}
                            </div>

                            {!compact && (
                                <span className={cn(
                                    'text-[9px] font-black uppercase tracking-wider whitespace-nowrap',
                                    isCompleted ? colors.text : isActive ? 'text-slate-600' : 'text-slate-300'
                                )}>
                                    {step.shortLabel}
                                </span>
                            )}
                        </div>

                        {/* Connector line between steps */}
                        {index < BOT_STEPS.length - 1 && (
                            <div
                                className={cn(
                                    'transition-all duration-500',
                                    compact ? 'h-0.5 w-4' : 'h-0.5 w-6 mb-4',
                                    isCompleted && currentStep > stepNumber
                                        ? colors.bg
                                        : 'bg-slate-200'
                                )}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
