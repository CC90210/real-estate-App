'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PLANS, PlanId } from '@/lib/plans'

export interface PlanLimitsData {
    // Access flags
    isSuperAdmin: boolean
    isPartner: boolean
    hasFullAccess: boolean

    // Plan info
    plan: PlanId | null
    planName: string
    status: string

    // Usage
    usage: {
        properties: number
        teamMembers: number
    }

    // Limits (Infinity for admins/partners)
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
        queryFn: async (): Promise<PlanLimitsData> => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Get profile with admin flags and company
            const { data: profile } = await supabase
                .from('profiles')
                .select(`
                    id,
                    company_id,
                    is_super_admin,
                    is_partner,
                    partner_type,
                    company:companies(
                        id,
                        subscription_plan,
                        subscription_status
                    )
                `)
                .eq('id', user.id)
                .single()

            if (!profile?.company_id) {
                throw new Error('No company found')
            }

            const isSuperAdmin = profile.is_super_admin || false
            const isPartner = profile.is_partner || false
            const hasFullAccess = isSuperAdmin || isPartner

            // Handle joined company data (can be object or array)
            const companyData: any = Array.isArray(profile.company) ? profile.company[0] : profile.company

            // Extract plan info with fallbacks
            const rawPlan = companyData?.subscription_plan || companyData?.plan || 'essentials'
            const planId = rawPlan as PlanId
            const status = companyData?.subscription_status || 'active'
            const isActivePlan = ['active', 'trialing'].includes(status)
            const plan = PLANS[planId] || PLANS.essentials

            // Get usage counts
            const [propertiesRes, teamRes] = await Promise.all([
                supabase.from('properties').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
            ])

            const usage = {
                properties: propertiesRes.count || 0,
                teamMembers: teamRes.count || 0,
            }

            // If super admin or partner, give full access
            if (hasFullAccess) {
                // Create full feature access object from enterprise
                const allFeatures: Record<string, boolean> = { ...PLANS.enterprise.features }

                return {
                    isSuperAdmin,
                    isPartner,
                    hasFullAccess: true,
                    plan: 'enterprise', // Treat as enterprise for UI levels
                    planName: isSuperAdmin ? 'Super Admin' : 'Partner',
                    status: 'active',
                    usage,
                    limits: {
                        properties: Infinity,
                        teamMembers: Infinity,
                    },
                    features: allFeatures,
                    canAddProperty: true,
                    canAddTeamMember: true,
                }
            }

            // Regular plan-based access
            const limits = plan.limits

            return {
                isSuperAdmin: false,
                isPartner: false,
                hasFullAccess: false,
                plan: planId,
                planName: plan.name,
                status,
                usage,
                limits,
                features: plan.features || {},
                canAddProperty: limits.properties === Infinity || usage.properties < limits.properties,
                canAddTeamMember: limits.teamMembers === Infinity || usage.teamMembers < limits.teamMembers,
            }
        },
        staleTime: 30000,
        retry: 1,
    })
}
