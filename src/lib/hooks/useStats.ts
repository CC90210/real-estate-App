'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { StatsService, DashboardStats, ActivityItem } from '@/lib/services/stats-service'
import { useAuth } from './useAuth'

export function useStats() {
    const { company, user, role, profile } = useAuth()
    const supabase = createClient()
    const statsService = new StatsService(supabase)

    const companyId = company?.id || profile?.company_id
    const userId = user?.id
    const isLandlord = role === 'landlord'

    const statsQuery = useQuery({
        queryKey: ['dashboard-stats', companyId, userId, role],
        queryFn: () => {
            if (!companyId) {
                console.warn('[useStats] No companyId found — dashboard stats cannot load. Check profile.company_id');
                return Promise.resolve(null);
            }
            return statsService.getDashboardStats(companyId!, userId, isLandlord);
        },
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
