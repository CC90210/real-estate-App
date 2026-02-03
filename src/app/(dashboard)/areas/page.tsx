'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Building2, MapPin } from 'lucide-react';
import { AddAreaModal } from '@/components/areas/AddAreaModal';
import { AreasList } from '@/components/areas/AreasList';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function AreasPage() {
    const supabase = createClient();
    const { colors } = useAccentColor();

    // Using a simple fetch here as it's a client component now for branding
    const [areas, setAreas] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchAreas() {
            const { data } = await supabase
                .from('areas')
                .select(`
                    *,
                    buildings (
                        id,
                        properties (id, status)
                    )
                `)
                .order('name');
            setAreas(data || []);
            setIsLoading(false);
        }
        fetchAreas();
    }, []);

    if (isLoading) {
        return <div className="p-10 text-slate-400">Loading tactical regions...</div>;
    }

    return (
        <div className="p-6 lg:p-10 space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1", colors.text)}>
                        <MapPin className="h-3 w-3" />
                        <span>Regional Oversight</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Areas</h1>
                    <p className="text-slate-500 font-medium">Manage your properties by geographic location.</p>
                </div>
                <AddAreaModal />
            </div>

            <AreasList initialAreas={areas || []} />
        </div>
    );
}
