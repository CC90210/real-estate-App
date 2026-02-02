'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useCompanyId } from './useCompanyId';

export function useAreas() {
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useQuery({
        queryKey: ['areas', companyId],
        queryFn: async () => {
            let query = supabase
                .from('areas')
                .select(`
                    *,
                    buildings (
                        id,
                        name,
                        properties (id, status)
                    )
                `)
                .order('name');

            if (companyId) {
                query = query.eq('company_id', companyId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Calculate counts for UI
            return data?.map(area => ({
                ...area,
                buildingCount: area.buildings?.length || 0,
                propertyCount: area.buildings?.reduce((acc: number, b: any) => acc + (b.properties?.length || 0), 0) || 0,
                availableCount: area.buildings?.reduce((acc: number, b: any) =>
                    acc + (b.properties?.filter((p: any) => p.status === 'available').length || 0), 0) || 0
            }));
        },
        enabled: !!companyId,
    });
}

export function useCreateArea() {
    const queryClient = useQueryClient();
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useMutation({
        mutationFn: async (newArea: { name: string; description?: string }) => {
            const { data, error } = await supabase
                .from('areas')
                .insert({ ...newArea, company_id: companyId })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['areas'] });
            toast.success('Area created successfully');
        },
        onError: (error: any) => {
            toast.error('Failed to create area: ' + error.message);
        },
    });
}

export function useDeleteArea() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async (areaId: string) => {
            const { error } = await supabase
                .from('areas')
                .delete()
                .eq('id', areaId);

            if (error) throw error;
            return areaId;
        },
        onMutate: async (areaId) => {
            await queryClient.cancelQueries({ queryKey: ['areas'] });
            const previous = queryClient.getQueryData(['areas']);

            queryClient.setQueryData(['areas'], (old: any[]) =>
                old?.filter(a => a.id !== areaId)
            );

            return { previous };
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['areas'], context?.previous);
            toast.error('Failed to delete area. Ensure it has no buildings.');
        },
        onSuccess: () => {
            toast.success('Area deleted successfully');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['areas'] });
        },
    });
}
