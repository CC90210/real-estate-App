'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PLANS, PlanId } from '@/lib/plans'

export interface PlanLimits {
    // Access flags
    isSuperAdmin: boolean
    isPartner: boolean
    hasFullAccess: boolean
    isActive: boolean
    isLifetime: boolean

    // Plan info
    plan: PlanId | null
    planName: string
    status: string

    // Usage
    usage: {
        properties: number
        teamMembers: number
    }

    // Limits
    limits: {
        properties: number
        teamMembers: number
    }

    // Feature access
    features: Record<string, boolean>

    // Convenience booleans
    canAddProperty: boolean
    canAddTeamMember: boolean
}

export function usePlanLimits() {
    const supabase = createClient()

    return useQuery({
        queryKey: ['plan-limits'],
        queryFn: async (): Promise<PlanLimits> => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Get profile and company info
            let { data: profile } = await supabase
                .from('profiles')
                .select(`
                    id,
                    email,
                    company_id,
                    is_super_admin,
                    is_partner,
                    partner_type,
                    company:companies(
                        id,
                        subscription_plan,
                        subscription_status,
                        is_lifetime_access,
                        feature_flags
                    )
                `)
                .eq('id', user.id)
                .single()

            // SELF-HEALING: If no profile or no company_id, try to repair
            if (!profile || !profile.company_id) {
                const { data: repairData, error: repairError } = await supabase.rpc('ensure_user_profile')
                if (!repairError) {
                    const { data: refetchedProfile } = await supabase
                        .from('profiles')
                        .select(`
                            id,
                            email,
                            company_id,
                            is_super_admin,
                            is_partner,
                            partner_type,
                            company:companies(
                                id,
                                subscription_plan,
                                subscription_status,
                                is_lifetime_access,
                                feature_flags
                            )
                        `)
                        .eq('id', user.id)
                        .single()
                    profile = refetchedProfile
                }
            }

            if (!profile?.company_id) {
                return {
                    isSuperAdmin: false,
                    isPartner: false,
                    hasFullAccess: false,
                    isActive: false,
                    isLifetime: false,
                    plan: 'essentials',
                    planName: 'Starter Grace',
                    status: 'active',
                    usage: { properties: 0, teamMembers: 0 },
                    limits: { properties: 5, teamMembers: 1 },
                    features: PLANS.essentials.features,
                    canAddProperty: true,
                    canAddTeamMember: true,
                }
            }

            const companyData: any = Array.isArray(profile.company) ? profile.company[0] : profile.company
            const isLifetime = companyData?.is_lifetime_access === true
            const isSuperAdmin = profile.is_super_admin || false
            const isPartner = profile.is_partner || false
            const hasFullAccess = isSuperAdmin || isPartner || isLifetime

            // Extract plan info
            const rawPlan = hasFullAccess ? 'enterprise' : (companyData?.subscription_plan || 'essentials')
            const planId = rawPlan as PlanId
            const status = companyData?.subscription_status || 'active'
            const isActive = ['active', 'trialing', 'past_due'].includes(status) || hasFullAccess
            const plan = PLANS[planId] || PLANS.essentials

            // Get current usage
            const [propertiesRes, teamRes] = await Promise.all([
                supabase
                    .from('properties')
                    .select('id', { count: 'exact', head: true })
                    .eq('company_id', profile.company_id),
                supabase
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .eq('company_id', profile.company_id),
            ])

            const usage = {
                properties: propertiesRes.count || 0,
                teamMembers: teamRes.count || 0,
            }

            const limits = plan.limits
            const featureOverrides = companyData?.feature_flags || {}

            // Merge features
            const features = {
                ...plan.features,
                ...featureOverrides
            }

            return {
                isSuperAdmin,
                isPartner,
                hasFullAccess,
                isActive,
                isLifetime,
                plan: planId,
                planName: isLifetime ? 'Enterprise (Lifetime)' : plan.name,
                status,
                usage,
                limits,
                features,
                canAddProperty: isActive && (limits.properties === Infinity || usage.properties < limits.properties),
                canAddTeamMember: isActive && (limits.teamMembers === Infinity || usage.teamMembers < limits.teamMembers),
            }
        },
        staleTime: 60000,
    })
}
