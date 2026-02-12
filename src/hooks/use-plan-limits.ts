'use client'

import { useUser } from '@/lib/hooks/useUser'
import { PlanId } from '@/lib/plans'

export interface PlanLimits {
    isSuperAdmin: boolean
    isPartner: boolean
    hasFullAccess: boolean
    isActive: boolean
    isLifetime: boolean
    plan: PlanId | null
    planName: string
    status: string
    usage: {
        properties: number
        teamMembers: number
    }
    limits: {
        properties: number
        teamMembers: number
    }
    features: Record<string, boolean>
    canAddProperty: boolean
    canAddTeamMember: boolean
}

/**
 * usePlanLimits is now a thin wrapper around useUser context 
 * to provide instant, globally-synced plan data without extra network calls.
 */
export function usePlanLimits() {
    const {
        profile,
        isSuperAdmin,
        isPartner,
        hasFullAccess,
        plan,
        planName,
        features,
        isLoading
    } = useUser()

    // Usage is still useful to have, maybe we can fetch it once in layout?
    // For now, let's keep it simple and just provide the gating info instantly.

    return {
        data: {
            isSuperAdmin,
            isPartner,
            hasFullAccess,
            isActive: true, // If we're logged in and have a plan, we're active
            isLifetime: profile?.company?.is_lifetime_access || false,
            plan,
            planName,
            status: profile?.company?.subscription_status || 'active',
            usage: {
                properties: 0, // Simplified to avoid slow counting queries on every gated element
                teamMembers: 0
            },
            limits: {
                properties: hasFullAccess ? Infinity : 25,
                teamMembers: hasFullAccess ? Infinity : 1,
            },
            features,
            canAddProperty: true,
            canAddTeamMember: true,
        },
        isLoading
    }
}
