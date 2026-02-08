'use client'

import { usePlanLimits } from '@/hooks/use-plan-limits'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowRight, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PLANS } from '@/lib/stripe/plans'

interface LimitGuardProps {
    type: 'properties' | 'teamMembers'
    children: React.ReactNode
}

export function LimitGuard({ type, children }: LimitGuardProps) {
    const { data: limits } = usePlanLimits()
    const router = useRouter()

    const canAdd = type === 'properties' ? limits?.canAddProperty : limits?.canAddTeamMember
    const current = (limits?.usage as any)?.[type] || 0
    const limit = (limits?.limits as any)?.[type] || 0
    const percentage = limit > 0 ? (current / limit) * 100 : 0

    // Show warning if at 80% or more
    const showWarning = percentage >= 80 && canAdd && limit !== Infinity

    return (
        <div className="space-y-6">
            {/* Usage indicator */}
            {limit > 0 && limit !== Infinity && (
                <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
                    <div className="flex justify-between items-end mb-4">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">
                                {type === 'properties' ? 'Inventory Volume' : 'Team Capacity'}
                            </span>
                            <span className={`text-2xl font-black ${percentage >= 100 ? 'text-red-600' : 'text-slate-900'}`}>
                                {current} <span className="text-slate-300">/</span> {limit}
                            </span>
                        </div>
                        {percentage >= 80 && (
                            <div className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded-lg text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                                <Zap className="h-3 w-3 fill-yellow-600" />
                                Low Capacity
                            </div>
                        )}
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-50">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${percentage >= 100 ? 'bg-red-500' :
                                percentage >= 80 ? 'bg-yellow-500' : 'bg-gradient-to-r from-indigo-500 to-violet-600'
                                }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Content or blocked state */}
            {canAdd || limit === Infinity ? (
                children
            ) : (
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-center shadow-2xl shadow-slate-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -mr-32 -mt-32" />

                    <div className="relative z-10">
                        <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 transform group-hover:scale-110 transition-transform">
                            <AlertTriangle className="h-8 w-8 text-yellow-400" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
                            Limit Reached.
                        </h3>
                        <p className="text-slate-400 font-medium text-sm mb-8 leading-relaxed max-w-xs mx-auto">
                            Your {limits?.planName} architecture supports up to {limit} {type === 'properties' ? 'properties' : 'team members'}. Expand your infrastructure to continue growing.
                        </p>
                        <Button
                            onClick={() => router.push('/pricing')}
                            className="h-12 px-8 bg-white text-slate-900 hover:bg-slate-200 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-3 mx-auto"
                        >
                            <ArrowRight className="h-4 w-4" />
                            View Upgrade Options
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
