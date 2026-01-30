
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Building2, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AddAreaModal } from '@/components/areas/AddAreaModal';
import { AreasList } from '@/components/areas/AreasList';

export default async function AreasPage() {
    const supabase = await createClient();

    const { data: areas, error } = await supabase
        .from('areas')
        .select(`
            *,
            buildings (
                id,
                properties (id, status)
            )
        `)
        .order('name');

    if (error) {
        return <div className="p-8 text-red-500 bg-red-50 rounded-lg">Error loading areas: {error.message}</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Areas</h1>
                    <p className="text-slate-500 mt-2">Manage your properties by geographic location.</p>
                </div>
                <AddAreaModal />
            </div>

            <AreasList initialAreas={areas || []} />
        </div>
    );
}
