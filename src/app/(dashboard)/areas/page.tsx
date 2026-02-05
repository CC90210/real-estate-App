'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { AddAreaModal } from '@/components/areas/AddAreaModal';
import { AreasList } from '@/components/areas/AreasList';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AreasPage() {
    const supabase = createClient();
    const { colors } = useAccentColor();

    const { data: areas, isLoading } = useQuery({
        queryKey: ['areas'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('areas')
                .select(`
                    *,
                    buildings (
                        id,
                        properties (id, status)
                    )
                `)
                .order('name');

            if (error) throw error;
            return data || [];
        }
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <Loader2 className={cn("w-10 h-10 animate-spin", colors.text)} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading tactical regions...</p>
            </div>
        );
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
                {/* 
                  AddAreaModal handles its own mutations. 
                  Since we use React Query, the list below will update automatically 
                  via cache invalidation/optimistic updates in the Modal.
                */}
                <AddAreaModal />
            </div>

            <AreasList initialAreas={areas || []} />
        </div>
    );
}
