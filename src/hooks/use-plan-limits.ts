'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PLANS, PlanId } from '@/lib/stripe/plans'

export interface PlanLimits {
    plan: PlanId | null
    planName: string
    usage: {
        properties: number
        teamMembers: number
    }
    limits: {
        properties: number
        teamMembers: number
    }
    features: {
        showingsCalendar: boolean
        invoiceGeneration: boolean
        advancedAnalytics: boolean
        automations: boolean
        paymentProcessing: boolean
        customIntegrations: boolean
        [key: string]: boolean
    }
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

            // Get profile and company
            const { data: profile } = await supabase
                .from('profiles')
                .select(`
                    company_id,
                    company:companies(
                        subscription_plan,
                        subscription_status,
                        is_lifetime_access,
                        feature_flags
                    )
                `)
                .eq('id', user.id)
                .single()

            const companyData = (profile as any)?.company
            let plan = companyData?.subscription_plan as PlanId | null
            const isLifetime = companyData?.is_lifetime_access === true

            // IF LIFETIME ACCESS IS ACTIVE -> GRANT ENTERPRISE
            if (isLifetime) {
                plan = 'enterprise'
            }

            // DEFAULT TO ESSENTIALS (Trial/Grace) if no plan
            const currentPlan = plan || 'essentials'
            const planConfig = (PLANS as any)[currentPlan]

            // Get current usage
            const [propertiesRes, teamRes] = await Promise.all([
                supabase
                    .from('properties')
                    .select('id', { count: 'exact', head: true })
                    .eq('company_id', profile?.company_id),
                supabase
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .eq('company_id', profile?.company_id),
            ])

            const usage = {
                properties: propertiesRes.count || 0,
                teamMembers: teamRes.count || 0,
            }

            // Limits (If no plan and not lifetime, we give a small grace limit)
            const limits = {
                properties: planConfig?.limits.properties ?? (plan ? 0 : 5),
                teamMembers: planConfig?.limits.teamMembers ?? (plan ? 0 : 1),
            }

            // Feature Flags Override
            const featureOverrides = companyData?.feature_flags || {}

            return {
                plan: plan,
                planName: isLifetime ? 'Enterprise (Lifetime)' : (planConfig?.name || 'Starter Grace'),
                usage,
                limits,
                features: {
                    showingsCalendar: featureOverrides.showingsCalendar ?? planConfig?.limits.showingsCalendar ?? false,
                    invoiceGeneration: featureOverrides.invoiceGeneration ?? planConfig?.limits.invoiceGeneration ?? false,
                    advancedAnalytics: featureOverrides.advancedAnalytics ?? planConfig?.limits.advancedAnalytics ?? false,
                    automations: featureOverrides.automations ?? planConfig?.limits.automations ?? false,
                    paymentProcessing: featureOverrides.paymentProcessing ?? planConfig?.limits.paymentProcessing ?? false,
                    customIntegrations: featureOverrides.customIntegrations ?? planConfig?.limits.customIntegrations ?? false,
                },
                canAddProperty: usage.properties < limits.properties,
                canAddTeamMember: usage.teamMembers < limits.teamMembers,
            }
        },
        staleTime: 30000, // Cache for 30 seconds
    })
}
