import { SupabaseClient } from '@supabase/supabase-js';
import { format, subDays, startOfMonth } from 'date-fns';

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
        const now = new Date();
        const oneWeekAgo = subDays(now, 7);
        const twoWeeksAgo = subDays(now, 14);
        const monthStart = startOfMonth(now);

        let propertyQuery = this.supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
        let applicationQuery = this.supabase.from('applications').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
        let invoiceQuery = this.supabase.from('invoices').select('total').eq('company_id', companyId).eq('status', 'paid').gte('updated_at', monthStart.toISOString());
        let maintenanceQuery = this.supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).eq('company_id', companyId).not('status', 'in', '("completed","cancelled")');
        let showingQuery = this.supabase.from('showings').select('*', { count: 'exact', head: true }).eq('company_id', companyId).gte('scheduled_date', now.toISOString());

        if (isLandlord && userId) {
            propertyQuery = propertyQuery.eq('owner_id', userId);
            // Applications and Showings need to be filtered by landlord's properties which is more complex in a single count query
            // For now, if landlord, we might need a different approach or join. 
            // In a real app, RLS would handle this, but here we specify the filters.
        }

        const [
            { count: totalProperties },
            { count: availableProperties },
            { count: rentedProperties },
            { count: totalApplications },
            { count: pendingApplications },
            { count: teamMembers },
            { count: totalAreas },
            { count: totalBuildings },
            { count: propertiesThisWeek },
            { count: propertiesLastWeek },
            { count: applicationsThisWeek },
            { count: applicationsLastWeek },
            { data: paidInvoices },
            { count: openMaintenance },
            { count: upcomingShowings }
        ] = await Promise.all([
            propertyQuery,
            this.supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'available'),
            this.supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'rented'),
            applicationQuery,
            this.supabase.from('applications').select('*', { count: 'exact', head: true }).eq('company_id', companyId).in('status', ['submitted', 'screening', 'pending_landlord']),
            this.supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
            this.supabase.from('areas').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
            this.supabase.from('buildings').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
            this.supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', oneWeekAgo.toISOString()),
            this.supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', twoWeeksAgo.toISOString()).lt('created_at', oneWeekAgo.toISOString()),
            this.supabase.from('applications').select('*', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', oneWeekAgo.toISOString()),
            this.supabase.from('applications').select('*', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', twoWeeksAgo.toISOString()).lt('created_at', oneWeekAgo.toISOString()),
            invoiceQuery,
            maintenanceQuery,
            showingQuery
        ]);

        const totalMonthlyRevenue = paidInvoices?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;

        return {
            totalProperties: totalProperties || 0,
            availableProperties: availableProperties || 0,
            rentedProperties: rentedProperties || 0,
            totalApplications: totalApplications || 0,
            pendingApplications: pendingApplications || 0,
            totalMonthlyRevenue,
            monthlyRevenue: totalMonthlyRevenue,
            propertyTrend: this.calcTrend(propertiesThisWeek || 0, propertiesLastWeek || 0),
            applicationTrend: this.calcTrend(applicationsThisWeek || 0, applicationsLastWeek || 0),
            teamMembers: teamMembers || 1,
            totalAreas: totalAreas || 0,
            totalBuildings: totalBuildings || 0,
            openMaintenance: openMaintenance || 0,
            upcomingShowings: upcomingShowings || 0
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
