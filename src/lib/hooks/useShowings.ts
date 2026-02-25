'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useCompanyId } from './useCompanyId';
import { useUser } from './useUser';

export interface Showing {
    id: string;
    property_id: string;
    agent_id: string | null;
    company_id: string;
    client_name: string;
    client_email: string | null;
    client_phone: string | null;
    scheduled_date: string;
    scheduled_time: string;
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
    notes: string | null;
    feedback: string | null;
    created_at: string;
    updated_at: string;
    properties?: {
        id: string;
        address: string;
    } | null;
    agent?: {
        id: string;
        full_name: string;
    } | null;
}

export function useShowings(options?: {
    agentId?: string;
    propertyId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
}) {
    const supabase = createClient();
    const { companyId } = useCompanyId();
    const { profile } = useUser();

    return useQuery({
        queryKey: ['showings', companyId, options, profile?.role],
        queryFn: async () => {
            let query = supabase
                .from('showings')
                .select(`
                    *,
                    properties (id, address),
                    agent:profiles!agent_id (id, full_name)
                `)
                .order('scheduled_date', { ascending: true })
                .order('scheduled_time', { ascending: true });

            if (companyId) {
                query = query.eq('company_id', companyId);
            }

            if (options?.agentId) {
                query = query.eq('agent_id', options.agentId);
            }

            if (options?.propertyId) {
                query = query.eq('property_id', options.propertyId);
            }

            if (options?.status) {
                query = query.eq('status', options.status);
            }

            if (options?.fromDate) {
                query = query.gte('scheduled_date', options.fromDate);
            }

            if (options?.toDate) {
                query = query.lte('scheduled_date', options.toDate);
            }

            if (profile?.role === 'landlord' && profile?.email) {
                // Find properties owned by this landlord
                const { data: landlordRecords } = await supabase
                    .from('landlords')
                    .select('id')
                    .eq('email', profile.email);

                const landlordIds = landlordRecords?.map(l => l.id) || [];

                if (landlordIds.length > 0) {
                    const { data: properties } = await supabase
                        .from('properties')
                        .select('id')
                        .in('landlord_id', landlordIds);

                    const propertyIds = properties?.map(p => p.id) || [];
                    if (propertyIds.length > 0) {
                        query = query.in('property_id', propertyIds);
                    } else {
                        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                    }
                } else {
                    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Showing[];
        },
        enabled: !!companyId,
        staleTime: 30000,
    });
}

export function useShowingsCount(options?: {
    agentId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
}) {
    const supabase = createClient();
    const { companyId } = useCompanyId();
    const { profile } = useUser();

    return useQuery({
        queryKey: ['showings_count', companyId, options, profile?.role],
        queryFn: async () => {
            let query = supabase
                .from('showings')
                .select('*', { count: 'exact', head: true });

            if (companyId) {
                query = query.eq('company_id', companyId);
            }

            if (options?.agentId) {
                query = query.eq('agent_id', options.agentId);
            }

            if (options?.status) {
                query = query.eq('status', options.status);
            }

            if (options?.fromDate) {
                query = query.gte('scheduled_date', options.fromDate);
            }

            if (options?.toDate) {
                query = query.lte('scheduled_date', options.toDate);
            }

            if (profile?.role === 'landlord' && profile?.email) {
                const { data: landlordRecords } = await supabase
                    .from('landlords')
                    .select('id')
                    .eq('email', profile.email);

                const landlordIds = landlordRecords?.map(l => l.id) || [];

                if (landlordIds.length > 0) {
                    const { data: properties } = await supabase
                        .from('properties')
                        .select('id')
                        .in('landlord_id', landlordIds);

                    const propertyIds = properties?.map(p => p.id) || [];
                    if (propertyIds.length > 0) {
                        query = query.in('property_id', propertyIds);
                    } else {
                        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                    }
                } else {
                    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                }
            }

            const { count, error } = await query;
            if (error) throw error;
            return count || 0;
        },
        enabled: !!companyId,
        staleTime: 30000,
    });
}

export function useCreateShowing() {
    const queryClient = useQueryClient();
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useMutation({
        mutationFn: async (newShowing: {
            property_id: string;
            agent_id?: string;
            client_name: string;
            client_email?: string;
            client_phone?: string;
            scheduled_date: string;
            scheduled_time: string;
            notes?: string;
        }) => {
            const { data, error } = await supabase
                .from('showings')
                .insert({
                    ...newShowing,
                    company_id: companyId,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['showings'] });
            queryClient.invalidateQueries({ queryKey: ['showings_count'] });
            toast.success('Showing scheduled');
        },
        onError: (error: any) => {
            toast.error('Failed to schedule showing: ' + error.message);
        },
    });
}

export function useUpdateShowing() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Showing> }) => {
            const { data, error } = await supabase
                .from('showings')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['showings'] });
            queryClient.invalidateQueries({ queryKey: ['showings_count'] });
            toast.success('Showing updated');
        },
        onError: (error: any) => {
            toast.error('Failed to update showing: ' + error.message);
        },
    });
}

export function useDeleteShowing() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async (showingId: string) => {
            const { error } = await supabase
                .from('showings')
                .delete()
                .eq('id', showingId);

            if (error) throw error;
            return showingId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['showings'] });
            queryClient.invalidateQueries({ queryKey: ['showings_count'] });
            toast.success('Showing deleted');
        },
        onError: (error: any) => {
            toast.error('Failed to delete showing: ' + error.message);
        },
    });
}
