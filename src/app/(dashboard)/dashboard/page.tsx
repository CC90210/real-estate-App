
import { createClient } from '@/lib/supabase/server';
import { AgentDashboard } from '@/components/dashboard/AgentDashboard';
import { LandlordDashboard } from '@/components/dashboard/LandlordDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const supabase = await createClient();

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
        // Security Note: We filter by 'landlord_id' in memory or query if applicable. 
        // Ideally we query properties where landlord_id = user.id
        const { data: myProperties } = await supabase
            .from('properties')
            .select('rent, status')
            .eq('landlord_id', user.id);

        const totalRevenue = myProperties?.reduce((sum, p) => sum + (Number(p.rent) || 0), 0) || 0;
        const totalUnits = myProperties?.length || 0;
        const occupiedCount = myProperties?.filter(p => p.status === 'rented').length || 0;
        const occupancyRate = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0;

        // Fetch Applications for MY properties
        // Complex join: Apps -> Properties -> where landlord_id = Me
        const { data: myApps } = await supabase
            .from('applications')
            .select('*, properties!inner(landlord_id, address)')
            .eq('properties.landlord_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

        return (
            <LandlordDashboard
                profile={profile}
                stats={{
                    totalRevenue,
                    occupancyRate,
                    totalUnits,
                    pendingRent: 0 // Placeholder until we have rent_payments table
                }}
                recentApps={myApps || []} // Pass the filtered data
            />
        );
    }

    // --- ADMIN LOGIC ---
    if (profile.role === 'admin') {
        const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { data: logs } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(10);

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
        .neq('status', 'approved')
        .neq('status', 'rejected');

    const { data: recentApps } = await supabase
        .from('applications')
        .select('*, properties(address)')
        .order('created_at', { ascending: false })
        .limit(5);

    return (
        <AgentDashboard
            profile={profile}
            stats={{
                activeLeads: activeLeads || 0,
                showingsScheduled: 4, // Mock task data
                pendingApps: activeLeads || 0,
                dealsClosed: 3 // Mock
            }}
            recentApps={recentApps || []}
        />
    );
}
