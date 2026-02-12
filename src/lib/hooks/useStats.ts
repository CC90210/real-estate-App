'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { StatsService, DashboardStats, ActivityItem } from '@/lib/services/stats-service'
import { useAuth } from './useAuth'

export function useStats() {
    const { company, user, role } = useAuth()
    const supabase = createClient()
    const statsService = new StatsService(supabase)

    const companyId = company?.id
    const userId = user?.id
    const isLandlord = role === 'landlord'

    const statsQuery = useQuery({
        queryKey: ['dashboard-stats', companyId, userId, role],
        queryFn: () => statsService.getDashboardStats(companyId!, userId, isLandlord),
        enabled: !!companyId,
        staleTime: 1000 * 60 * 2, // 2 minutes
    })

    const activityQuery = useQuery({
        queryKey: ['recent-activity', companyId],
        queryFn: () => statsService.getRecentActivity(companyId!),
        enabled: !!companyId,
        staleTime: 1000 * 60 * 1, // 1 minute
    })

    return {
        stats: statsQuery.data as DashboardStats | undefined,
        isLoading: statsQuery.isLoading,
        error: statsQuery.error,
        recentActivity: activityQuery.data as ActivityItem[] | undefined,
        activityLoading: activityQuery.isLoading,
        refetch: () => {
            statsQuery.refetch()
            activityQuery.refetch()
        }
    }
}
