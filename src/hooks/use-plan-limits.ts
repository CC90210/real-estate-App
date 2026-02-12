'use client'

import { useQuery } from '@tanstack/react-query'
import { getPlanInfo, PlanInfo } from '@/lib/services/plan-service'
import { useUser } from '@/lib/hooks/useUser'

export type { PlanInfo as PlanLimits }

/**
 * usePlanLimits - Fetches actual plan data AND usage counts
 * Uses React Query for caching and automatic revalidation
 */
export function usePlanLimits() {
    const { profile, isLoading: userLoading } = useUser()
    const companyId = profile?.company?.id || profile?.company_id

    const { data, isLoading, error, refetch } = useQuery<PlanInfo>({
        queryKey: ['plan-limits', companyId],
        queryFn: () => getPlanInfo(companyId),
        enabled: !userLoading && !!companyId,
        staleTime: 30000, // Cache for 30 seconds
        gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
        refetchOnWindowFocus: false,
    })

    return {
        data: data || null,
        isLoading: userLoading || isLoading,
        error,
        refetch,
    }
}
