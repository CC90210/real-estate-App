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
                        subscription_status
                    )
                `)
                .eq('id', user.id)
                .single()

            const plan = (profile as any)?.company?.subscription_plan as PlanId | null
            const planConfig = plan ? (PLANS as any)[plan] : null

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

            const limits = {
                properties: planConfig?.limits.properties ?? 0,
                teamMembers: planConfig?.limits.teamMembers ?? 0,
            }

            return {
                plan,
                planName: planConfig?.name || 'No Plan',
                usage,
                limits,
                features: {
                    showingsCalendar: planConfig?.limits.showingsCalendar ?? false,
                    invoiceGeneration: planConfig?.limits.invoiceGeneration ?? false,
                    advancedAnalytics: planConfig?.limits.advancedAnalytics ?? false,
                    automations: planConfig?.limits.automations ?? false,
                    paymentProcessing: planConfig?.limits.paymentProcessing ?? false,
                    customIntegrations: planConfig?.limits.customIntegrations ?? false,
                },
                canAddProperty: usage.properties < limits.properties,
                canAddTeamMember: usage.teamMembers < limits.teamMembers,
            }
        },
        staleTime: 30000, // Cache for 30 seconds
    })
}
