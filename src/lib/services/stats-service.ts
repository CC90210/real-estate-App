import { SupabaseClient } from '@supabase/supabase-js';

export interface DashboardStats {
    totalProperties: number;
    availableProperties: number;
    rentedProperties: number;
    totalApplications: number;
    pendingApplications: number;
    totalMonthlyRevenue: number;
    monthlyRevenue: number; // Alias for consistency
    propertyTrend: string | null;
    applicationTrend: string | null;
    teamMembers: number;
    totalAreas: number;
    totalBuildings: number;
    openMaintenance: number;
    upcomingShowings: number;
}

export interface ActivityItem {
    id: string;
    action: string;
    entity_type: string;
    details: any;
    created_at: string;
    user: {
        full_name: string;
        avatar_url: string | null;
    } | null;
}

export class StatsService {
    constructor(private supabase: SupabaseClient) { }

    private calcTrend(current: number, previous: number): string | null {
        if (previous === 0 && current === 0) return null;
        if (previous === 0) return current > 0 ? `+${current}` : null;
        const change = ((current - previous) / previous) * 100;
        if (change === 0) return null;
        return change > 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
    }

    async getDashboardStats(companyId: string, userId?: string, isLandlord?: boolean): Promise<DashboardStats> {
        // High-performance single database call
        const { data, error } = await this.supabase.rpc('get_enhanced_dashboard_stats', {
            p_company_id: companyId,
            p_user_id: userId,
            p_is_landlord: isLandlord
        });

        if (error || !data) {
            console.error('Core stats fetch failed, falling back to manual counts...', error);
            // In case RPC isn't deployed yet, return empty stats or proceed with original logic
            return {
                totalProperties: 0,
                availableProperties: 0,
                rentedProperties: 0,
                totalApplications: 0,
                pendingApplications: 0,
                totalMonthlyRevenue: 0,
                monthlyRevenue: 0,
                propertyTrend: null,
                applicationTrend: null,
                teamMembers: 1,
                totalAreas: 0,
                totalBuildings: 0,
                openMaintenance: 0,
                upcomingShowings: 0
            };
        }

        return {
            ...data,
            propertyTrend: this.calcTrend(data.currentWeekProps || 0, data.lastWeekProps || 0),
            applicationTrend: this.calcTrend(data.currentWeekApps || 0, data.lastWeekApps || 0)
        };
    }

    async getRecentActivity(companyId: string, limit = 50, filter = 'all'): Promise<ActivityItem[]> {
        let query = this.supabase
            .from('activity_log')
            .select(`
                id,
                action,
                entity_type,
                metadata,
                created_at,
                user:profiles(full_name, avatar_url, email)
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (filter !== 'all') {
            query = query.eq('entity_type', filter);
        }

        const { data } = await query;

        return (data || []).map(item => ({
            ...item,
            details: item.metadata,
            user: Array.isArray(item.user) ? item.user[0] : item.user
        })) as any[];
    }
}
