
import { createClient } from '@/lib/supabase/server';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AddAreaModal } from '@/components/areas/AddAreaModal';
import { AddApplicationModal } from '@/components/applications/AddApplicationModal';
import { ApplicationList } from '@/components/applications/ApplicationsList';

export default async function ApplicationsPage() {
    const supabase = await createClient();

    // Fetch applications with joined property address
    const { data: applications } = await supabase
        .from('applications')
        .select(`
            *,
            property:properties(address, rent)
        `)
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Applications</h1>
                    <p className="text-slate-500 mt-2">Manage tenant screening and approvals.</p>
                </div>
                <AddApplicationModal />
            </div>

            <ApplicationList applications={applications || []} />
        </div>
    );
}
