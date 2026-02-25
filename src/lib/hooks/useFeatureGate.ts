'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { resolveCompanyPlan, CompanyPlanInfo } from '@/lib/plans/resolve'
import { GateableResource } from '@/lib/plans/gate'

export function useFeatureGate() {
    const supabase = createClient()

    const { data: planInfo, isLoading } = useQuery({
        queryKey: ['company-plan'],
        queryFn: async (): Promise<CompanyPlanInfo & { counts: Record<string, number> }> => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single()

            if (!profile?.company_id) throw new Error('No company')

            const { data: company } = await supabase
                .from('companies')
                .select('subscription_plan, subscription_status, plan_override, property_count, team_member_count, social_account_count')
                .eq('id', profile.company_id)
                .single()

            if (!company) throw new Error('Company not found')

            const resolved = resolveCompanyPlan(company as any)
            return {
                ...resolved,
                counts: {
                    properties: company.property_count || 0,
                    teamMembers: company.team_member_count || 0,
                    socialPlatforms: company.social_account_count || 0,
                },
            }
        },
        staleTime: 5 * 60 * 1000,
    })

    function canCreate(resource: GateableResource) {
        if (!planInfo) return { allowed: false, currentCount: 0, limit: 0, message: 'Loading...' }

        const limit = planInfo.effectivePlan.limits[resource]
        const current = planInfo.counts[resource] || 0

        if (limit === -1 || limit === undefined) return { allowed: true, currentCount: current, limit: -1 }

        return {
            allowed: current < limit,
            currentCount: current,
            limit,
            message: current >= limit
                ? `You've reached the ${resource} limit (${current}/${limit}). Upgrade your plan to add more.`
                : undefined,
        }
    }

    function hasFeature(featureName: string): boolean {
        if (!planInfo) return false
        const allFeatures = [
            ...planInfo.effectivePlan.features.crm,
            ...planInfo.effectivePlan.features.finance,
            ...planInfo.effectivePlan.features.social,
        ]
        return allFeatures.some(f => f.toLowerCase().includes(featureName.toLowerCase()))
    }

    return {
        planInfo,
        isLoading,
        canCreate,
        hasFeature,
        isEnterprise: planInfo?.isEnterprise || false,
        planName: planInfo?.effectivePlan.name || 'Loading...',
        subscriptionStatus: planInfo?.subscriptionStatus || 'none',
    }
}
