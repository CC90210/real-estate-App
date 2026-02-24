import { createClient } from '@supabase/supabase-js'
import { PLANS, PlanId, Plan } from '@/lib/stripe/plans'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface UsageStats {
    properties: number
    teamMembers: number
}

export interface LimitCheckResult {
    allowed: boolean
    reason?: string
    currentUsage: number
    limit: number
    upgradeRequired?: PlanId
}

// Map old plan IDs to new ones for backward compatibility
function normalizePlanId(planId: string | null | undefined): PlanId | null {
    if (!planId) return null
    const map: Record<string, PlanId> = {
        essentials: 'agent_pro',
        professional: 'agency_growth',
        enterprise: 'brokerage_command',
        agent_pro: 'agent_pro',
        agency_growth: 'agency_growth',
        brokerage_command: 'brokerage_command',
    }
    return map[planId] || null
}

// Get company's current status (including lifetime bypass)
export async function getCompanySubscriptionInfo(companyId: string) {
    const { data } = await supabaseAdmin
        .from('companies')
        .select('subscription_plan, subscription_status, is_lifetime_access, feature_flags')
        .eq('id', companyId)
        .single()
    return data
}

// Get company's current plan (handling bypass)
export async function getCompanyPlan(companyId: string): Promise<PlanId | null> {
    const data = await getCompanySubscriptionInfo(companyId)

    if (data?.is_lifetime_access) return 'brokerage_command'

    // Check if subscription is active
    if (!data?.subscription_plan ||
        !['active', 'trialing'].includes(data.subscription_status || '')) {
        return null
    }

    return normalizePlanId(data.subscription_plan)
}

// Get company's current usage
export async function getCompanyUsage(companyId: string): Promise<UsageStats> {
    const [propertiesRes, teamRes] = await Promise.all([
        supabaseAdmin
            .from('properties')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId),
        supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId),
    ])

    return {
        properties: propertiesRes.count || 0,
        teamMembers: teamRes.count || 0,
    }
}

// Check if company can add more properties
export async function canAddProperty(companyId: string): Promise<LimitCheckResult> {
    const info = await getCompanySubscriptionInfo(companyId)
    const plan = info?.is_lifetime_access
        ? 'brokerage_command' as PlanId
        : normalizePlanId(info?.subscription_plan)

    if (!plan && !info?.is_lifetime_access) {
        return {
            allowed: false,
            reason: 'No active subscription. Please subscribe to add properties.',
            currentUsage: 0,
            limit: 0,
        }
    }

    const currentPlan = plan || 'agent_pro' as PlanId
    const planConfig = PLANS[currentPlan]
    const usage = await getCompanyUsage(companyId)
    const limit = info?.is_lifetime_access ? Infinity : (planConfig?.limits.properties ?? 0)

    if (limit !== -1 && usage.properties >= limit) {
        const upgradeRequired: PlanId = currentPlan === 'agent_pro' ? 'agency_growth' : 'brokerage_command'

        return {
            allowed: false,
            reason: `You've reached your limit of ${limit} properties. Upgrade to ${PLANS[upgradeRequired].name} for more.`,
            currentUsage: usage.properties,
            limit,
            upgradeRequired,
        }
    }

    return {
        allowed: true,
        currentUsage: usage.properties,
        limit: limit === -1 ? Infinity : limit,
    }
}

// Check if company can add more team members
export async function canAddTeamMember(companyId: string): Promise<LimitCheckResult> {
    const info = await getCompanySubscriptionInfo(companyId)
    const plan = info?.is_lifetime_access
        ? 'brokerage_command' as PlanId
        : normalizePlanId(info?.subscription_plan)

    if (!plan && !info?.is_lifetime_access) {
        return {
            allowed: false,
            reason: 'No active subscription.',
            currentUsage: 0,
            limit: 0,
        }
    }

    const currentPlan = plan || 'agent_pro' as PlanId
    const planConfig = PLANS[currentPlan]
    const usage = await getCompanyUsage(companyId)
    const limit = info?.is_lifetime_access ? Infinity : (planConfig?.limits.teamMembers ?? 0)

    if (limit !== -1 && usage.teamMembers >= limit) {
        const upgradeRequired: PlanId = currentPlan === 'agent_pro' ? 'agency_growth' : 'brokerage_command'

        return {
            allowed: false,
            reason: `You've reached your limit of ${limit} team member${limit > 1 ? 's' : ''}. Upgrade to add more.`,
            currentUsage: usage.teamMembers,
            limit,
            upgradeRequired,
        }
    }

    return {
        allowed: true,
        currentUsage: usage.teamMembers,
        limit: limit === -1 ? Infinity : limit,
    }
}

// Check if company has access to a specific feature
export async function canAccessFeature(
    companyId: string,
    feature: string
): Promise<{ allowed: boolean; reason?: string; upgradeRequired?: PlanId }> {
    const info = await getCompanySubscriptionInfo(companyId)

    // 1. Check Lifetime Bypass
    if (info?.is_lifetime_access) return { allowed: true }

    // 2. Check Feature Flag Overrides
    if (info?.feature_flags && (info.feature_flags as any)[feature] === true) {
        return { allowed: true }
    }

    const plan = await getCompanyPlan(companyId)

    if (!plan) {
        return {
            allowed: false,
            reason: 'No active subscription.',
        }
    }

    const planConfig = PLANS[plan]
    const allowed = !!(planConfig?.limits as any)?.[feature]

    if (!allowed) {
        // Find which plan has this feature
        let upgradeRequired: PlanId = 'agency_growth'
        if (!(PLANS.agency_growth.limits as any)[feature]) {
            upgradeRequired = 'brokerage_command'
        }

        const featureNames: Record<string, string> = {
            showings: 'Showings',
            invoices: 'Invoices',
            analytics: 'Analytics',
            automations: 'Automations',
            paymentProcessing: 'Payment Processing',
            customIntegrations: 'Custom Integrations',
            socialPlatforms: 'Social Media',
        }

        return {
            allowed: false,
            reason: `${featureNames[feature] || feature} is not available on your current plan. Upgrade to ${PLANS[upgradeRequired].name} to unlock.`,
            upgradeRequired,
        }
    }

    return { allowed: true }
}
