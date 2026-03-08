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

    private async getStatsDirect(companyId: string): Promise<DashboardStats & { recentActivity: ActivityItem[] }> {
        // Direct query fallback when the RPC doesn't exist or fails
        const [
            propsRes, appsRes, paidInvRes, allInvRes,
            maintenanceRes, showingsRes, teamRes,
            areasRes, buildingsRes, activityRes
        ] = await Promise.all([
            this.supabase.from('properties').select('status, rent').eq('company_id', companyId),
            this.supabase.from('applications').select('status').eq('company_id', companyId),
            this.supabase.from('invoices').select('total, paid_at, paid_date, updated_at, created_at').eq('company_id', companyId).eq('status', 'paid'),
            this.supabase.from('invoices').select('total').eq('company_id', companyId).eq('status', 'paid'),
            this.supabase.from('maintenance_requests').select('id', { count: 'exact', head: true }).eq('company_id', companyId).in('status', ['open', 'in_progress']),
            this.supabase.from('showings').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('scheduled_date', new Date().toISOString().split('T')[0]),
            this.supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
            this.supabase.from('areas').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
            this.supabase.from('buildings').select('id, area_id').eq('company_id', companyId),
            this.supabase.from('activity_log').select('id, action, entity_type, details, created_at, user:profiles(full_name, avatar_url, email)').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20),
        ]);

        const props = propsRes.data || [];
        const apps = appsRes.data || [];
        const paidInvoices = paidInvRes.data || [];

        const totalProperties = props.length;
        const availableProperties = props.filter(p => p.status === 'available').length;
        const rentedProperties = props.filter(p => p.status === 'rented').length;
        const totalMonthlyRent = props.filter(p => p.status === 'rented').reduce((sum, p) => sum + (Number(p.rent) || 0), 0);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const totalMonthlyRevenue = paidInvoices.reduce((sum, inv: any) => {
            const d = new Date(inv.paid_at || inv.paid_date || inv.updated_at || inv.created_at);
            return d >= startOfMonth ? sum + (Number(inv.total) || 0) : sum;
        }, 0);
        const totalLifetimeRevenue = (allInvRes.data || []).reduce((sum, inv: any) => sum + (Number(inv.total) || 0), 0);

        const activity = (activityRes.data || []).map(item => ({
            ...item,
            user: Array.isArray(item.user) ? item.user[0] : item.user
        })) as ActivityItem[];

        return {
            totalProperties,
            availableProperties,
            rentedProperties,
            totalApplications: apps.length,
            pendingApplications: apps.filter(a => a.status === 'new' || a.status === 'pending' || a.status === 'submitted').length,
            totalMonthlyRevenue,
            monthlyRevenue: totalMonthlyRevenue,
            propertyTrend: null,
            applicationTrend: null,
            teamMembers: teamRes.count || 0,
            totalAreas: areasRes.count || 0,
            totalBuildings: (buildingsRes.data || []).length,
            openMaintenance: maintenanceRes.count || 0,
            upcomingShowings: showingsRes.count || 0,
            totalMonthlyRent,
            totalLifetimeRevenue,
            recentActivity: activity,
            occupancyRate: totalProperties > 0 ? Math.round((rentedProperties / totalProperties) * 100) : 0,
        } as any;
    }

    async getDashboardStats(companyId: string, userId?: string, isLandlord: boolean = false): Promise<DashboardStats & { recentActivity: ActivityItem[] }> {
        // Try the RPC first; if it doesn't exist or fails, fall back to direct queries
        const { data, error } = await this.supabase.rpc('get_enhanced_dashboard_stats', {
            p_company_id: companyId,
            p_user_id: userId || null,
            p_is_landlord: isLandlord
        });

        if (error) {
            // If RPC doesn't exist (42883) or has any error, use direct query fallback
            console.warn('RPC get_enhanced_dashboard_stats failed, using direct queries:', error.message);
            return this.getStatsDirect(companyId);
        }

        if (!data) {
            throw new Error('No data returned from dashboard stats RPC');
        }

        // PostgreSQL RPCs return snake_case keys; normalise to camelCase so the
        // rest of the app works regardless of which convention the RPC uses.
        const d = data as Record<string, any>;
        const get = (camel: string, snake: string) => d[camel] ?? d[snake] ?? 0;

        return {
            totalProperties: get('totalProperties', 'total_properties'),
            availableProperties: get('availableProperties', 'available_properties'),
            rentedProperties: get('rentedProperties', 'rented_properties'),
            totalApplications: get('totalApplications', 'total_applications'),
            pendingApplications: get('pendingApplications', 'pending_applications'),
            totalMonthlyRevenue: get('totalMonthlyRevenue', 'total_monthly_revenue'),
            monthlyRevenue: get('totalMonthlyRevenue', 'total_monthly_revenue'),
            propertyTrend: null,
            applicationTrend: null,
            teamMembers: get('teamMembers', 'team_members'),
            totalAreas: get('totalAreas', 'total_areas'),
            totalBuildings: get('totalBuildings', 'total_buildings'),
            openMaintenance: get('openMaintenance', 'open_maintenance'),
            upcomingShowings: get('upcomingShowings', 'upcoming_showings'),
            totalMonthlyRent: get('totalMonthlyRent', 'total_monthly_rent'),
            totalLifetimeRevenue: get('totalLifetimeRevenue', 'total_lifetime_revenue'),
            recentActivity: d.recentActivity ?? d.recent_activity ?? [],
            occupancyRate: get('occupancyRate', 'occupancy_rate'),
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
