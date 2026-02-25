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
    totalMonthlyRent: number;
    totalLifetimeRevenue: number;
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

    async getDashboardStats(companyId: string, userId?: string, isLandlord: boolean = false): Promise<DashboardStats & { recentActivity: ActivityItem[] }> {
        const { data, error } = await this.supabase.rpc('get_enhanced_dashboard_stats', {
            p_company_id: companyId,
            p_user_id: userId || null,
            p_is_landlord: isLandlord
        });

        if (error) {
            console.error('RPC Error fetching dashboard stats:', error);
            throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
        }

        if (!data) {
            throw new Error('No data returned from dashboard stats RPC');
        }

        return {
            totalProperties: data.totalProperties || 0,
            availableProperties: data.availableProperties || 0,
            rentedProperties: data.rentedProperties || 0,
            totalApplications: data.totalApplications || 0,
            pendingApplications: data.pendingApplications || 0,
            totalMonthlyRevenue: data.totalMonthlyRevenue || 0,
            monthlyRevenue: data.totalMonthlyRevenue || 0, // Alias
            propertyTrend: null,
            applicationTrend: null,
            teamMembers: data.teamMembers || 0,
            totalAreas: data.totalAreas || 0,
            totalBuildings: data.totalBuildings || 0,
            openMaintenance: data.openMaintenance || 0,
            upcomingShowings: data.upcomingShowings || 0,
            totalMonthlyRent: data.totalMonthlyRent || 0,
            totalLifetimeRevenue: data.totalLifetimeRevenue || 0,
            recentActivity: data.recentActivity || [],
            occupancyRate: data.occupancyRate || 0,
        } as any;
    }

    async getRecentActivity(companyId: string, limit = 50, filter = 'all'): Promise<ActivityItem[]> {
        let query = this.supabase
            .from('activity_log')
            .select(`
                id,
                action,
                entity_type,
                details,
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
            user: Array.isArray(item.user) ? item.user[0] : item.user
        })) as any[];
    }
}
