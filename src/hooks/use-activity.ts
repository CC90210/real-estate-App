'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { StatsService, ActivityItem } from '@/lib/services/stats-service'
import { useAuth } from '@/lib/hooks/useAuth'

/**
 * Unified activity hook — ensures Dashboard and Activity page
 * show the SAME data from the SAME source (activity_log table).
 * 
 * @param limit - Number of activity items to fetch (default: 50)
 * @param filter - Entity type filter, 'all' for everything
 */
export function useActivity(limit = 50, filter = 'all') {
    const supabase = createClient()
    const { company, profile } = useAuth()
    const companyId = company?.id || profile?.company_id
    const statsService = new StatsService(supabase)

    return useQuery<ActivityItem[]>({
        queryKey: ['activity-feed', companyId, filter, limit],
        queryFn: async () => {
            if (!companyId) return []
            return statsService.getRecentActivity(companyId, limit, filter)
        },
        enabled: !!companyId,
        staleTime: 30000,
        retry: (failureCount, error) => {
            if (error instanceof Error && error.message.includes('recursion')) {
                return false
            }
            return failureCount < 2
        },
    })
}
