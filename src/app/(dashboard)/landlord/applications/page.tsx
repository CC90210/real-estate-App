'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/hooks/useUser';
import { ApplicationReviewCard } from '@/components/landlord/ApplicationReviewCard';
import { Loader2, Inbox, ShieldAlert } from 'lucide-react';
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
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
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
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Application Approvals</h1>
                <p className="text-slate-500 mt-2">Review full screening reports and decide on tenancy.</p>
            </div>

            {applications.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-20 text-center">
                    <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900">No Applications Yet</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-2">Applications submitted by your agents will appear here for final approval.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
