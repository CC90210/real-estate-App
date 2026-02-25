import { createClient } from '@/lib/supabase/server'
import { resolveCompanyPlan } from './resolve'

export type GateableResource = 'properties' | 'teamMembers' | 'socialPlatforms'

export interface GateResult {
    allowed: boolean
    currentCount: number
    limit: number          // -1 means unlimited
    planName: string
    upgradeRequired: boolean
    message?: string
}

export async function checkPlanLimit(
    companyId: string,
    resource: GateableResource
): Promise<GateResult> {
    const supabase = await createClient()


    // Get company with plan info and current counts
    const { data: company, error } = await supabase
        .from('companies')
        .select('subscription_plan, subscription_status, plan_override, property_count, team_member_count, social_account_count')
        .eq('id', companyId)
        .single()

    if (error || !company) {
        return {
            allowed: false,
            currentCount: 0,
            limit: 0,
            planName: 'Unknown',
            upgradeRequired: true,
            message: 'Could not verify plan. Please try again.',
        }
    }

    const { effectivePlan } = resolveCompanyPlan(company)
    const limit = effectivePlan.limits[resource]

    // Map resource to the correct counter column
    const countMap: Record<GateableResource, number> = {
        properties: company.property_count || 0,
        teamMembers: company.team_member_count || 0,
        socialPlatforms: company.social_account_count || 0,
    }
    const currentCount = countMap[resource]

    // Unlimited (-1) always allowed
    if (limit === -1 || limit === undefined) {
        return {
            allowed: true,
            currentCount,
            limit: -1,
            planName: effectivePlan.name,
            upgradeRequired: false,
        }
    }

    // Check if under limit
    const allowed = currentCount < limit

    return {
        allowed,
        currentCount,
        limit,
        planName: effectivePlan.name,
        upgradeRequired: !allowed,
        message: !allowed
            ? `You've reached the ${resource} limit (${currentCount}/${limit}) on your ${effectivePlan.name} plan. Upgrade to add more.`
            : undefined,
    }
}
