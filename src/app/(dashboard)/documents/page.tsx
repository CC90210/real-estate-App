
import { createClient } from '@/lib/supabase/server';
import { DocumentGenerator } from '@/components/documents/DocumentGenerator';

export default async function DocumentsPage() {
    const supabase = await createClient();

    // Fetch necessary data for the generator selectors
    const { data: properties } = await supabase
        .from('properties')
        .select(`
            *,
            buildings(*)
        `)
        .order('address');

    const { data: applications } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Document Generator</h1>
                <p className="text-slate-500 mt-2">Create professional real estate documents in seconds.</p>
            </div>

            <DocumentGenerator
                properties={properties || []}
                applications={applications || []}
            />
        </div>
    );
}
