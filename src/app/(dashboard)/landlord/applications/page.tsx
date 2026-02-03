'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/hooks/useUser';
import { ApplicationReviewCard } from '@/components/landlord/ApplicationReviewCard';
import { Loader2, Inbox, ShieldAlert, CheckCircle, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

export default function LandlordApplicationsPage() {
    const { profile, user } = useUser();
    const [applications, setApplications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    const fetchApplications = async () => {
        if (!user) return;

        try {
            // Fetch applications for properties owned by this landlord
            const { data, error } = await supabase
                .from('applications')
                .select(`
                    *,
                    property:properties (
                        address,
                        rent,
                        owner_id
                    )
                `)
                .eq('property.owner_id', user.id) // Enforce ownership filter
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Supabase joins don't always filter the root record if the join fails equality on sub-property 
            // without a nested filter, so we filter again client-side for absolute safety if RLS isn't 100% yet.
            const ownedApps = data?.filter(app => app.property?.owner_id === user.id) || [];

            setApplications(ownedApps);
        } catch (error: any) {
            console.error("Error fetching landlord applications:", error);
            toast.error("Failed to load applications");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, [user]);

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            const { error } = await supabase
                .from('applications')
                .update({ status })
                .eq('id', id);

            if (error) throw error;

            toast.success(`Application ${status} successfully`);
            fetchApplications();
        } catch (error: any) {
            toast.error("Status update failed: " + error.message);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading applicant data...</p>
            </div>
        );
    }

    if (profile?.role !== 'landlord' && profile?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-red-50 rounded-2xl border border-red-100">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-red-900">Access Restricted</h2>
                <p className="text-red-700 max-w-md mt-2">Sensitive screening results (Credit Scores & Reports) are only visible to Property Owners and Admins.</p>
            </div>
        );
    }

    return (
        <div className="relative p-6 lg:p-10 space-y-8 min-h-screen">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[5%] left-[25%] w-[50rem] h-[50rem] bg-gradient-to-br from-emerald-100/40 to-teal-100/40 rounded-full blur-[120px] animate-float" />
                <div className="absolute bottom-[10%] right-[15%] w-[40rem] h-[40rem] bg-gradient-to-br from-amber-100/30 to-orange-100/30 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-4s' }} />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200/60">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-emerald-600 text-sm font-bold uppercase tracking-widest animate-in fade-in slide-in-from-left duration-500">
                        <ClipboardList className="h-4 w-4" />
                        <span>Decision Center</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 animate-in fade-in slide-in-from-left duration-700">Application Approvals</h1>
                    <p className="text-slate-500 text-lg max-w-2xl mt-2 leading-relaxed">Review full screening reports (Credit, Criminal, Eviction) and decide on tenancy.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-sm">
                        {applications.filter(a => ['submitted', 'screening', 'pending_landlord'].includes(a.status)).length} Pending
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 font-bold text-sm">
                        {applications.filter(a => a.status === 'approved').length} Approved
                    </div>
                </div>
            </div>

            {applications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white/50 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-slate-200">
                    <div className="h-20 w-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mb-6">
                        <Inbox className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">No Pending Applications</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-2 leading-relaxed">Applications submitted by your agents will appear here for your final approval.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '100ms' }}>
                    {applications.map((app) => (
                        <ApplicationReviewCard
                            key={app.id}
                            application={app}
                            onStatusUpdate={handleStatusUpdate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
