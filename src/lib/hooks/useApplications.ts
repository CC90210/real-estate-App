'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Application, ApplicationFormData } from '@/types/database';

// Fetch all applications (for landlords/admins)
export function useApplications(status?: string) {
    return useQuery({
        queryKey: ['applications', status],
        queryFn: async () => {
            let query = supabase
                .from('applications')
                .select(`
          *,
          property:properties(*, building:buildings(*)),
          agent:profiles(*)
        `)
                .order('created_at', { ascending: false });

            if (status && status !== 'all') {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data as Application[];
        },
    });
}

// Fetch single application
export function useApplication(applicationId: string) {
    return useQuery({
        queryKey: ['applications', applicationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('applications')
                .select(`
          *,
          property:properties(*, building:buildings(*, area:areas(*))),
          agent:profiles(*)
        `)
                .eq('id', applicationId)
                .single();

            if (error) throw error;
            return data as Application;
        },
        enabled: !!applicationId,
    });
}

// Fetch applications for a specific property
export function usePropertyApplications(propertyId: string) {
    return useQuery({
        queryKey: ['applications', 'property', propertyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('applications')
                .select(`
          *,
          agent:profiles(*)
        `)
                .eq('property_id', propertyId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Application[];
        },
        enabled: !!propertyId,
    });
}

// Fetch applications created by an agent
export function useAgentApplications(agentId: string) {
    return useQuery({
        queryKey: ['applications', 'agent', agentId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('applications')
                .select(`
          *,
          property:properties(*, building:buildings(*))
        `)
                .eq('agent_id', agentId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Application[];
        },
        enabled: !!agentId,
    });
}

// Create application
export function useCreateApplication() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            propertyId,
            agentId,
            formData,
        }: {
            propertyId: string;
            agentId: string;
            formData: ApplicationFormData;
        }) => {
            const { data, error } = await supabase
                .from('applications')
                .insert({
                    property_id: propertyId,
                    agent_id: agentId,
                    ...formData,
                    status: 'new',
                    screening_status: 'pending',
                })
                .select()
                .single();

            if (error) throw error;

            // Send webhook
            try {
                await fetch('/api/webhook/application', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ applicationId: data.id }),
                });
            } catch (e) {
                console.error('Webhook failed:', e);
            }

            return data as Application;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
    });
}

// Update application status
export function useUpdateApplicationStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            status,
        }: {
            id: string;
            status: 'approved' | 'denied' | 'withdrawn';
        }) => {
            const { data, error } = await supabase
                .from('applications')
                .update({
                    status,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Application;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            queryClient.setQueryData(['applications', data.id], data);
        },
    });
}

// Get application stats
export function useApplicationStats() {
    return useQuery({
        queryKey: ['applications', 'stats'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('applications')
                .select('status, screening_status');

            if (error) throw error;

            const stats = {
                total: data.length,
                pending: data.filter((a) => a.status === 'new' || a.status === 'screening').length,
                approved: data.filter((a) => a.status === 'approved').length,
                denied: data.filter((a) => a.status === 'denied').length,
                screeningComplete: data.filter((a) => a.screening_status === 'completed').length,
            };

            return stats;
        },
    });
}
