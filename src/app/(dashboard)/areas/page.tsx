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
import { useAuth } from '@/lib/hooks/useAuth';

export const dynamic = 'force-dynamic';

export default function AreasPage() {
    const supabase = createClient();
    const { colors } = useAccentColor();

    const { isLoading: authLoading, company } = useAuth();
    const resolvedCompanyId = company?.id;

    const { data: areas, isLoading } = useQuery({
        queryKey: ['areas', resolvedCompanyId],
        queryFn: async () => {
            if (!resolvedCompanyId) return []
            const { data, error } = await supabase
                .from('areas')
                .select(`
                    *,
                    buildings (
                        id,
                        properties (id, status)
                    )
                `)
                .eq('company_id', resolvedCompanyId)
                .order('name');

            if (error) throw error;
            return data || [];
        },
        enabled: !!resolvedCompanyId
    });

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <Loader2 className={cn("w-10 h-10 animate-spin", colors.text)} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading tactical regions...</p>
            </div>
        );
    }

    if (!resolvedCompanyId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <p className="text-slate-500 font-medium">Unable to load workspace data.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                    Refresh Page
                </button>
            </div>
        );
    }

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
