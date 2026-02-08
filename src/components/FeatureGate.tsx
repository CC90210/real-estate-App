'use client'

import { usePlanLimits, PlanLimits } from '@/hooks/use-plan-limits'
import { Button } from '@/components/ui/button'
import { Lock, Sparkles, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PLANS, PlanId } from '@/lib/stripe'

interface FeatureGateProps {
    feature: keyof PlanLimits['features']
    children: React.ReactNode
    fallback?: React.ReactNode
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
    const { data: limits, isLoading } = usePlanLimits()
    const router = useRouter()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500/20" />
            </div>
        )
    }

    if (!limits || !limits.features[feature as string]) {
        const featureKey = feature as string;
        // Find which plan unlocks this feature
        let requiredPlan: PlanId = 'professional'
        if (!(PLANS.professional.limits as any)[featureKey]) {
            requiredPlan = 'enterprise'
        }

        if (fallback) return <>{fallback}</>

        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                <div className="h-20 w-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-100">
                    <Lock className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Feature Locked.</h3>
                <p className="text-slate-500 font-medium mb-10 max-w-sm mx-auto leading-relaxed">
                    The {featureKey.replace(/([A-Z])/g, ' $1').toLowerCase()} is restricted to our <strong>{PLANS[requiredPlan].name}</strong> tier. Upgrade to unlock full operational intelligence.
                </p>
                <Button
                    onClick={() => router.push('/pricing')}
                    className="h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-100"
                >
                    <Sparkles className="h-4 w-4 mr-2 fill-white" />
                    Upgrade Now
                </Button>
            </div>
        )
    }

    return <>{children}</>
}
