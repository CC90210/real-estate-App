'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function useApplications() {
    const supabase = createClient();

    return useQuery({
        queryKey: ['applications'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('applications')
                .select(`
                    *,
                    properties (id, address, rent, bedrooms, bathrooms),
                    agent:profiles!created_by(id, full_name, role)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching applications:", error);
                throw new Error("Failed to fetch applications");
            }
            return data;
        },
    });
}

export function useDeleteApplication() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async (applicationId: string) => {
            // First delete related activity log entries
            const { error: logsError } = await supabase
                .from('activity_log')
                .delete()
                .eq('entity_id', applicationId)
                .eq('entity_type', 'application');

            // Then delete the application
            const { error } = await supabase
                .from('applications')
                .delete()
                .eq('id', applicationId);

            if (error) throw error;
            return applicationId;
        },
        onMutate: async (applicationId) => {
            await queryClient.cancelQueries({ queryKey: ['applications'] });
            const previous = queryClient.getQueryData(['applications']);

            queryClient.setQueryData(['applications'], (old: any[]) =>
                old?.filter(a => a.id !== applicationId)
            );

            return { previous };
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['applications'], context?.previous);
            toast.error('Failed to delete application');
        },
        onSuccess: () => {
            toast.success('Application deleted successfully');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
    });
}

export function useUpdateApplicationStatus() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { data, error } = await supabase
                .from('applications')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Log the activity
            await supabase.from('activity_log').insert({
                action: status === 'approved' ? 'APPLICATION_APPROVED' : 'APPLICATION_DENIED',
                entity_type: 'application',
                entity_id: id,
                description: `Application status updated to ${status}`
            });

            return data;
        },
        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries({ queryKey: ['applications'] });
            const previous = queryClient.getQueryData(['applications']);

            queryClient.setQueryData(['applications'], (old: any[]) =>
                old?.map(a => a.id === id ? { ...a, status } : a)
            );

            return { previous };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            queryClient.invalidateQueries({ queryKey: ['activity_log'] });
            toast.success('Application status updated');
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['applications'], context?.previous);
            toast.error('Failed to update status');
        },
    });
}
