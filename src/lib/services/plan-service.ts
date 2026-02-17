'use client'

import { createClient } from '@/lib/supabase/client'
import { PLANS, PlanId } from '@/lib/plans'

export interface PlanInfo {
    plan: PlanId
    planId: PlanId  // Alias for compatibility
    planName: string
    status: 'active' | 'trialing' | 'lifetime' | 'past_due' | 'cancelled' | 'none'
    isSuperAdmin: boolean
    isPartner: boolean
    hasFullAccess: boolean
    isLifetime: boolean
    limits: {
        properties: number
        teamMembers: number
    }
    usage: {
        properties: number
        teamMembers: number
    }
    features: Record<string, boolean>
    canAddProperty: boolean
    canAddTeamMember: boolean
}

/**
 * SINGLE SOURCE OF TRUTH FOR PLAN INFO
 * Fetches plan data AND actual usage counts
 */
export async function getPlanInfo(companyId?: string): Promise<PlanInfo> {
    const supabase = createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return getDefaultPlanInfo('none')
        }

        // Hardcoded super admin bypass — owner always gets full access
        const SUPER_ADMIN_EMAILS = ['konamak@icloud.com'];
        const isHardcodedAdmin = user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());

        // Get profile with company data in ONE query
        const { data: profile, error } = await supabase
            .from('profiles')
            .select(`
                id,
                is_super_admin,
                is_partner,
                partner_type,
                company_id,
                company:companies (
                    id,
                    name,
                    subscription_plan,
                    subscription_status,
                    is_lifetime_access
                )
            `)
            .eq('id', user.id)
            .single()

        if (error || !profile) {
            console.error('Failed to fetch profile:', error)
            // If hardcoded admin, still give full access even without profile
            if (isHardcodedAdmin) {
                return getDefaultPlanInfo('active', true)
            }
            return getDefaultPlanInfo('active', true)
        }

        const company = Array.isArray(profile.company) ? profile.company[0] : profile.company
        const currentCompanyId = company?.id || profile.company_id

        // Get actual usage counts
        let propertyCount = 0
        let teamCount = 1

        if (currentCompanyId) {
            const [propertiesRes, teamRes] = await Promise.all([
                supabase
                    .from('properties')
                    .select('id', { count: 'exact', head: true })
                    .eq('company_id', currentCompanyId),
                supabase
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .eq('company_id', currentCompanyId)
            ])
            propertyCount = propertiesRes.count || 0
            teamCount = teamRes.count || 1
        }

        // Check for admin/partner/lifetime status
        const isSuperAdmin = profile.is_super_admin === true || !!isHardcodedAdmin
        const isPartner = profile.is_partner === true
        const isLifetime = company?.is_lifetime_access === true
        const hasFullAccess = isSuperAdmin || isPartner || isLifetime

        // If has full access, give enterprise
        if (hasFullAccess) {
            return {
                plan: 'enterprise',
                planId: 'enterprise',
                planName: isSuperAdmin ? 'Super Admin' :
                    isPartner ? `Partner (${profile.partner_type || 'Founding'})` :
                        'Enterprise (Lifetime)',
                status: 'lifetime',
                isSuperAdmin,
                isPartner,
                hasFullAccess: true,
                isLifetime,
                limits: { properties: Infinity, teamMembers: Infinity },
                usage: { properties: propertyCount, teamMembers: teamCount },
                features: PLANS.enterprise.features as Record<string, boolean>,
                canAddProperty: true,
                canAddTeamMember: true,
            }
        }

        // Get plan from company
        const planId = (company?.subscription_plan as PlanId) || 'essentials'
        const status = company?.subscription_status || 'active'
        const planConfig = PLANS[planId] || PLANS.essentials

        // Calculate limits
        const propertyLimit = planConfig.limits.properties
        const teamLimit = planConfig.limits.teamMembers

        return {
            plan: planId,
            planId,
            planName: planConfig.name,
            status: status as any,
            isSuperAdmin: false,
            isPartner: false,
            hasFullAccess: false,
            isLifetime: false,
            limits: {
                properties: propertyLimit,
                teamMembers: teamLimit,
            },
            usage: {
                properties: propertyCount,
                teamMembers: teamCount,
            },
            features: planConfig.features as Record<string, boolean>,
            canAddProperty: propertyLimit === Infinity || propertyCount < propertyLimit,
            canAddTeamMember: teamLimit === Infinity || teamCount < teamLimit,
        }

    } catch (error) {
        console.error('Plan info error:', error)
        return getDefaultPlanInfo('active', true)
    }
}

function getDefaultPlanInfo(status: string, giveAccess = false): PlanInfo {
    if (giveAccess) {
        return {
            plan: 'enterprise',
            planId: 'enterprise',
            planName: 'Access Granted',
            status: 'active',
            isSuperAdmin: false,
            isPartner: false,
            hasFullAccess: true,
            isLifetime: false,
            limits: { properties: Infinity, teamMembers: Infinity },
            usage: { properties: 0, teamMembers: 1 },
            features: PLANS.enterprise.features as Record<string, boolean>,
            canAddProperty: true,
            canAddTeamMember: true,
        }
    }

    return {
        plan: 'essentials',
        planId: 'essentials',
        planName: 'Essentials',
        status: status as any,
        isSuperAdmin: false,
        isPartner: false,
        hasFullAccess: false,
        isLifetime: false,
        limits: { properties: 25, teamMembers: 1 },
        usage: { properties: 0, teamMembers: 1 },
        features: PLANS.essentials.features as Record<string, boolean>,
        canAddProperty: true,
        canAddTeamMember: true,
    }
}
