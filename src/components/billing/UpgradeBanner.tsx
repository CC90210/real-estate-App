'use client'

import { useFeatureGate } from '@/lib/hooks/useFeatureGate'
import { PLANS, PlanId } from '@/lib/stripe/plans'
import { toast } from 'sonner'
import { Lock, ArrowRight } from 'lucide-react'

export function UpgradeBanner({ resource, currentCount, limit }: {
    resource: string
    currentCount: number
    limit: number
}) {
    const { planInfo } = useFeatureGate()
    if (!planInfo) return null

    // Determine the next plan up
    const upgradeOrder: PlanId[] = ['agent_pro', 'agency_growth', 'brokerage_command']
    const currentIndex = upgradeOrder.indexOf(planInfo.effectivePlan.id as PlanId)

    // If they are on enterprise or brokerage command, they shouldn't see this unless they somehow hit a limit (which shouldn't happen)
    const nextPlan = currentIndex < upgradeOrder.length - 1 ? upgradeOrder[currentIndex + 1] : null

    if (!nextPlan || planInfo.isEnterprise) return null

    const handleUpgrade = async () => {
        const loadingToast = toast.loading('Preparing checkout...')
        try {
            const res = await fetch('/api/stripe/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPlan: nextPlan }),
            })
            const data = await res.json()

            if (data.url) {
                // New checkout — redirect to Stripe
                toast.dismiss(loadingToast)
                window.location.href = data.url
            } else if (data.success) {
                // Existing subscription updated — refresh the page
                toast.success(data.message, { id: loadingToast })
                setTimeout(() => window.location.reload(), 1500)
            } else {
                toast.error(data.error || 'Upgrade failed', { id: loadingToast })
            }
        } catch (err) {
            toast.error('Something went wrong. Please try again.', { id: loadingToast })
        }
    }

    return (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-amber-100/50 rounded-xl flex items-center justify-center shrink-0">
                    <Lock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                    <p className="font-bold text-amber-900 text-lg">
                        {resource.charAt(0).toUpperCase() + resource.slice(1)} limit reached ({currentCount}/{limit})
                    </p>
                    <p className="text-sm font-medium text-amber-700/80 mt-1 max-w-lg">
                        Upgrade your workspace to <strong className="text-amber-900">{PLANS[nextPlan].name}</strong> to unlock up to{' '}
                        {PLANS[nextPlan].limits[resource as keyof typeof PLANS[typeof nextPlan]['limits']] === -1
                            ? 'unlimited'
                            : PLANS[nextPlan].limits[resource as keyof typeof PLANS[typeof nextPlan]['limits']]
                        }{' '}
                        {resource}.
                    </p>
                </div>
            </div>
            <button
                onClick={handleUpgrade}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 whitespace-nowrap"
            >
                Upgrade to {PLANS[nextPlan].name}
                <ArrowRight className="h-4 w-4" />
            </button>
        </div>
    )
}
