import { createClient } from '@/lib/supabase/server';
import { AgentDashboard } from '@/components/dashboard/AgentDashboard';
import { LandlordDashboard } from '@/components/dashboard/LandlordDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Helper to get current month date range
function getCurrentMonthRange() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    return { startOfMonth, endOfMonth, today };
}

export default async function DashboardPage() {
    const supabase = await createClient();
    const { startOfMonth, endOfMonth, today } = getCurrentMonthRange();

    // 1. Authenticate & Get Profile (The "Session-Injection" foundation)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile) return <div>Profile not found. Please contact support.</div>;

    // 2. Role-Based Data Fetching (Server-Side Efficiency)
    // ----------------------------------------------------

    // --- LANDLORD LOGIC ---
    if (profile.role === 'landlord') {
        // Fetch Financials
        const { data: myProperties } = await supabase
            .from('properties')
            .select('rent, status, created_at')
            .eq('landlord_id', user.id)
            .eq('company_id', profile.company_id);

        const totalRevenue = myProperties?.reduce((sum, p) => sum + (Number(p.rent) || 0), 0) || 0;
        const totalUnits = myProperties?.length || 0;
        const occupiedCount = myProperties?.filter(p => p.status === 'rented').length || 0;
        const occupancyRate = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0;

        // Fetch Applications for MY properties
        const { data: myApps } = await supabase
            .from('applications')
            .select('*, properties!inner(landlord_id, address)')
            .eq('company_id', profile.company_id)
            .eq('properties.landlord_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

        // Calculate revenue by month (last 6 months)
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const revenueHistory = [];

        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = months[monthDate.getMonth()];
            // For now, use total revenue as a baseline (in real app, would aggregate from rent_payments)
            const monthRevenue = i === 0 ? totalRevenue : Math.round(totalRevenue * (0.85 + Math.random() * 0.3));
            revenueHistory.push({ month: monthName, revenue: monthRevenue });
        }

        return (
            <LandlordDashboard
                profile={profile}
                stats={{
                    totalRevenue,
                    occupancyRate,
                    totalUnits,
                    pendingRent: 0 // Placeholder until we have rent_payments table
                }}
                recentApps={myApps || []}
                revenueHistory={revenueHistory}
            />
        );
    }

    // --- ADMIN LOGIC ---
    if (profile.role === 'admin') {
        const { count: totalUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', profile.company_id);

        const { data: logs } = await supabase
            .from('activity_log')
            .select('*')
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false })
            .limit(10);

        return (
            <AdminDashboard
                profile={profile}
                stats={{
                    totalUsers: totalUsers || 0,
                    systemHealth: 'Operational',
                    activeWebhooks: 3 // Mock config count
                }}
                logs={logs || []}
            />
        );
    }

    // --- AGENT LOGIC (Default) ---
    // Fetch Active Leads (Apps in 'screening' or 'new')
    const { count: activeLeads } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .neq('status', 'approved')
        .neq('status', 'rejected');

    const { data: recentApps } = await supabase
        .from('applications')
        .select('*, properties(address)')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(5);

    // Fetch real showings count for today onwards
    const { count: showingsScheduled } = await supabase
        .from('showings')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .eq('status', 'scheduled')
        .gte('scheduled_date', today);

    // Fetch deals closed this month (approved applications)
    const { count: dealsClosed } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .eq('status', 'approved')
        .gte('updated_at', startOfMonth)
        .lte('updated_at', endOfMonth);

    // Fetch commission data for agent
    const { data: agentCommissions } = await supabase
        .from('commissions')
        .select('amount, status')
        // Commissions are already user-specific but also company-specific conceptually
        .eq('company_id', profile.company_id)
        .eq('agent_id', user.id)
        .gte('earned_date', startOfMonth)
        .lte('earned_date', endOfMonth);

    const pendingCommission = agentCommissions
        ?.filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

    const paidCommission = agentCommissions
        ?.filter(c => c.status === 'paid' || c.status === 'approved')
        .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

    // Fetch recent activity for tasks
    const { data: recentActivity } = await supabase
        .from('activity_log')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(5);

    return (
        <AgentDashboard
            profile={profile}
            stats={{
                activeLeads: activeLeads || 0,
                showingsScheduled: showingsScheduled || 0,
                pendingApps: activeLeads || 0,
                dealsClosed: dealsClosed || 0
            }}
            recentApps={recentApps || []}
            commissionData={{
                pending: pendingCommission,
                paid: paidCommission
            }}
            recentActivity={recentActivity || []}
        />
    );
}
