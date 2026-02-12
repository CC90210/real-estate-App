import { createClient } from '@/lib/supabase/server'
import { PLANS, PlanId, FeatureKey } from '@/lib/plans'

export interface UserAccess {
    isSuperAdmin: boolean
    isPartner: boolean
    partnerType: string | null
    plan: PlanId | null
    planStatus: string
    hasFullAccess: boolean
}

/**
 * Get user's access level
 * Super admins and partners get FULL ACCESS regardless of plan
 */
export async function getUserAccess(): Promise<UserAccess> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return {
            isSuperAdmin: false,
            isPartner: false,
            partnerType: null,
            plan: null,
            planStatus: 'none',
            hasFullAccess: false,
        }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            is_super_admin,
            is_partner,
            partner_type,
            company:companies(
                subscription_plan,
                subscription_status
            )
        `)
        .eq('id', user.id)
        .single()

    // Handle profile being potentially null
    if (!profile) {
        return {
            isSuperAdmin: false,
            isPartner: false,
            partnerType: null,
            plan: null,
            planStatus: 'none',
            hasFullAccess: false,
        }
    }

    // Handle company being an array or object
    const companyData = Array.isArray(profile.company) ? profile.company[0] : profile.company

    const isSuperAdmin = profile.is_super_admin || false
    const isPartner = profile.is_partner || false
    const partnerType = profile.partner_type || null
    const plan = (companyData?.subscription_plan || 'essentials') as PlanId
    const planStatus = companyData?.subscription_status || 'active'

    // Super admins and partners get FULL ACCESS
    const hasFullAccess = isSuperAdmin || isPartner

    return {
        isSuperAdmin,
        isPartner,
        partnerType,
        plan,
        planStatus,
        hasFullAccess,
    }
}

/**
 * Check if user can access a specific feature
 */
export async function canAccessFeature(feature: FeatureKey): Promise<boolean> {
    const access = await getUserAccess()

    // Super admins and partners bypass all restrictions
    if (access.hasFullAccess) {
        return true
    }

    // Check plan-based access
    if (!access.plan || !['active', 'trialing'].includes(access.planStatus)) {
        return false
    }

    const planConfig = PLANS[access.plan]
    return planConfig?.features?.[feature] ?? false
}

/**
 * Check if user can access based on plan limits
 */
export async function checkPlanLimits(companyId: string): Promise<{
    canAddProperty: boolean
    canAddTeamMember: boolean
    propertyCount: number
    propertyLimit: number
    teamCount: number
    teamLimit: number
}> {
    const supabase = await createClient()
    const access = await getUserAccess()

    // Get counts
    const [propertiesRes, teamRes] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    ])

    const propertyCount = propertiesRes.count || 0
    const teamCount = teamRes.count || 0

    // Super admins/partners have no limits
    if (access.hasFullAccess) {
        return {
            canAddProperty: true,
            canAddTeamMember: true,
            propertyCount,
            propertyLimit: Infinity,
            teamCount,
            teamLimit: Infinity,
        }
    }

    // Get plan limits
    const plan = access.plan ? PLANS[access.plan] : null
    const propertyLimit = plan?.limits.properties ?? 0
    const teamLimit = plan?.limits.teamMembers ?? 0

    return {
        canAddProperty: propertyLimit === Infinity || propertyCount < propertyLimit,
        canAddTeamMember: teamLimit === Infinity || teamCount < teamLimit,
        propertyCount,
        propertyLimit,
        teamCount,
        teamLimit,
    }
}
