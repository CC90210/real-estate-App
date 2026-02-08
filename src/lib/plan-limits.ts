import { createClient } from '@supabase/supabase-js'
import { PLANS, PlanId, getLimit, hasFeature } from '@/lib/stripe/plans'

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

// Get company's current plan
export async function getCompanyPlan(companyId: string): Promise<PlanId | null> {
    const { data } = await supabaseAdmin
        .from('companies')
        .select('subscription_plan, subscription_status')
        .eq('id', companyId)
        .single()

    // Check if subscription is active
    if (!data?.subscription_plan ||
        !['active', 'trialing'].includes(data.subscription_status || '')) {
        return null
    }

    return data.subscription_plan as PlanId
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
    const plan = await getCompanyPlan(companyId)

    if (!plan) {
        return {
            allowed: false,
            reason: 'No active subscription. Please subscribe to add properties.',
            currentUsage: 0,
            limit: 0,
        }
    }

    const usage = await getCompanyUsage(companyId)
    const limit = getLimit(plan, 'properties')

    if (usage.properties >= limit) {
        // Find the next plan that would allow more
        const upgradeRequired = plan === 'essentials' ? ('professional' as const) : ('enterprise' as const)

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
        limit,
    }
}

// Check if company can add more team members
export async function canAddTeamMember(companyId: string): Promise<LimitCheckResult> {
    const plan = await getCompanyPlan(companyId)

    if (!plan) {
        return {
            allowed: false,
            reason: 'No active subscription.',
            currentUsage: 0,
            limit: 0,
        }
    }

    const usage = await getCompanyUsage(companyId)
    const limit = getLimit(plan, 'teamMembers')

    if (usage.teamMembers >= limit) {
        const upgradeRequired = plan === 'essentials' ? ('professional' as const) : ('enterprise' as const)

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
        limit,
    }
}

// Check if company has access to a specific feature
export async function canAccessFeature(
    companyId: string,
    feature: keyof typeof PLANS.essentials.limits
): Promise<{ allowed: boolean; reason?: string; upgradeRequired?: PlanId }> {
    const plan = await getCompanyPlan(companyId)

    if (!plan) {
        return {
            allowed: false,
            reason: 'No active subscription.',
        }
    }

    const allowed = hasFeature(plan, feature)

    if (!allowed) {
        // Find which plan has this feature
        let upgradeRequired: PlanId = 'professional'
        if (!PLANS.professional.limits[feature]) {
            upgradeRequired = 'enterprise'
        }

        const featureNames: Record<string, string> = {
            showingsCalendar: 'Showings Calendar',
            invoiceGeneration: 'Invoice Generation',
            advancedAnalytics: 'Advanced Analytics',
            automations: 'Automations',
            paymentProcessing: 'Payment Processing',
            customIntegrations: 'Custom Integrations',
        }

        return {
            allowed: false,
            reason: `${featureNames[feature] || feature} is not available on your current plan. Upgrade to ${PLANS[upgradeRequired].name} to unlock.`,
            upgradeRequired,
        }
    }

    return { allowed: true }
}
