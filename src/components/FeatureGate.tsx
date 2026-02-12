'use client'

import { useUser } from '@/lib/hooks/useUser'
import { Button } from '@/components/ui/button'
import { Lock, Sparkles, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PLANS, PlanId } from '@/lib/plans'

interface FeatureGateProps {
    feature: string
    children: React.ReactNode
    fallback?: React.ReactNode
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
    const { features, planName, isLoading, hasFullAccess } = useUser()
    const router = useRouter()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500/20" />
            </div>
        )
    }

    const isAvailable = hasFullAccess || features[feature]

    if (!isAvailable) {
        const featureKey = feature;

        // Find which plan unlocks this feature
        let requiredPlan: PlanId = 'professional'
        if (!(PLANS.professional.features as any)[featureKey]) {
            requiredPlan = 'enterprise'
        }

        if (fallback) return <>{fallback}</>

        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="h-24 w-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-slate-200">
                    <Lock className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Feature Restricted</h3>
                <p className="text-slate-500 font-bold mb-10 max-w-sm mx-auto leading-relaxed">
                    The <span className="text-slate-900 font-black">{featureKey.replace(/([A-Z])/g, ' $1').toLowerCase()}</span> module requires the <span className="text-indigo-600 font-black">{PLANS[requiredPlan].name}</span> architecture.
                    Your current <span className="font-black text-slate-900">{planName}</span> tier does not include this tool.
                </p>
                <Button
                    onClick={() => router.push('/settings')}
                    className="h-16 px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-100"
                >
                    <Sparkles className="h-4 w-4 mr-2 fill-white" />
                    Expand Infrastructure
                </Button>
            </div>
        )
    }

    return <>{children}</>
}
