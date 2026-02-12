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

    return {
        stats: statsQuery.data as DashboardStats | undefined,
        isLoading: statsQuery.isLoading,
        error: statsQuery.error,
        recentActivity: statsQuery.data?.recentActivity as ActivityItem[] | undefined,
        activityLoading: statsQuery.isLoading,
        refetch: () => {
            statsQuery.refetch()
        }
    }
}
