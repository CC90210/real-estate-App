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

    async getDashboardStats(companyId: string, userId?: string, isLandlord?: boolean): Promise<DashboardStats & { recentActivity: ActivityItem[] }> {
        // ALWAYS fallback to manual direct DB queries because RPC falls out of sync


        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const [
            propertiesRes,
            availableRes,
            rentedRes,
            applicationsRes,
            pendingAppsRes,
            invoicesRes,
            teamRes,
            areasRes,
            buildingsRes,
            maintenanceRes,
            showingsRes,
            activityRes,
            leasesRes
        ] = await Promise.all([
            this.supabase.from('properties').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
            this.supabase.from('properties').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'available'),
            this.supabase.from('properties').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'rented'),
            this.supabase.from('applications').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
            this.supabase.from('applications').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'pending'),
            // Fetch paid invoices - use total field (not amount) and check both paid_date and updated_at
            this.supabase.from('invoices').select('total, updated_at, created_at, paid_date').eq('company_id', companyId).eq('status', 'paid'),
            this.supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
            Promise.resolve(this.supabase.from('areas').select('id', { count: 'exact', head: true }).eq('company_id', companyId)).catch(() => ({ count: 0, data: null, error: null })),
            Promise.resolve(this.supabase.from('buildings').select('id', { count: 'exact', head: true }).eq('company_id', companyId)).catch(() => ({ count: 0, data: null, error: null })),
            Promise.resolve(this.supabase.from('maintenance_requests').select('id', { count: 'exact', head: true }).eq('company_id', companyId).in('status', ['open', 'in_progress'])).catch(() => ({ count: 0, data: null, error: null })),
            Promise.resolve(this.supabase.from('showings').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('showing_date', now.toISOString())).catch(() => ({ count: 0, data: null, error: null })),
            Promise.resolve(this.supabase.from('activity_log').select('id, action, entity_type, details, created_at, user:profiles(full_name, avatar_url, email)').eq('company_id', companyId).order('created_at', { ascending: false }).limit(10)).catch(() => ({ data: [], error: null })),
            Promise.resolve(this.supabase.from('leases').select('rent_amount').eq('company_id', companyId).eq('status', 'active')).catch(() => ({ data: [], error: null })),
        ]);

        // Calculate monthly revenue from paid invoices — match invoices page logic
        let totalMonthlyRevenue = 0;
        if (invoicesRes.data && Array.isArray(invoicesRes.data)) {
            totalMonthlyRevenue = invoicesRes.data
                .filter((inv: any) => {
                    // Use paid_date if available, otherwise fall back to updated_at or created_at
                    const paidDate = new Date(inv.paid_date || inv.updated_at || inv.created_at);
                    return paidDate >= new Date(monthStart);
                })
                .reduce((sum: number, inv: any) => sum + (Number(inv.total) || 0), 0);
        }

        const totalMonthlyRent = (leasesRes as any).data?.reduce((sum: number, l: any) => sum + (l.rent_amount || 0), 0) || 0;

        const recentActivity = ((activityRes as any).data || []).map((item: any) => ({
            ...item,
            user: Array.isArray(item.user) ? item.user[0] : item.user
        }));

        return {
            totalProperties: propertiesRes.count || 0,
            availableProperties: availableRes.count || 0,
            rentedProperties: rentedRes.count || 0,
            totalApplications: applicationsRes.count || 0,
            pendingApplications: pendingAppsRes.count || 0,
            totalMonthlyRevenue,
            monthlyRevenue: totalMonthlyRevenue,
            propertyTrend: null,
            applicationTrend: null,
            teamMembers: teamRes.count || 0,
            totalAreas: (areasRes as any).count || 0,
            totalBuildings: (buildingsRes as any).count || 0,
            openMaintenance: (maintenanceRes as any).count || 0,
            upcomingShowings: (showingsRes as any).count || 0,
            totalMonthlyRent,
            recentActivity
        };
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
