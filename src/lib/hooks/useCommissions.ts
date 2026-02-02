'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useCompanyId } from './useCompanyId';

export interface Commission {
    id: string;
    agent_id: string;
    property_id: string | null;
    application_id: string | null;
    company_id: string;
    amount: number;
    status: 'pending' | 'approved' | 'paid';
    description: string | null;
    earned_date: string;
    paid_date: string | null;
    created_at: string;
    updated_at: string;
    agent?: {
        id: string;
        full_name: string;
    } | null;
    properties?: {
        id: string;
        address: string;
    } | null;
}

export function useCommissions(options?: {
    agentId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
}) {
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useQuery({
        queryKey: ['commissions', companyId, options],
        queryFn: async () => {
            let query = supabase
                .from('commissions')
                .select(`
                    *,
                    agent:profiles!agent_id (id, full_name),
                    properties (id, address)
                `)
                .order('earned_date', { ascending: false });

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
                query = query.gte('earned_date', options.fromDate);
            }

            if (options?.toDate) {
                query = query.lte('earned_date', options.toDate);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Commission[];
        },
        enabled: !!companyId,
        staleTime: 30000,
    });
}

export function useCommissionsSummary(agentId?: string) {
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useQuery({
        queryKey: ['commissions_summary', companyId, agentId],
        queryFn: async () => {
            // Get current month range
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

            let query = supabase
                .from('commissions')
                .select('amount, status');

            if (companyId) {
                query = query.eq('company_id', companyId);
            }

            if (agentId) {
                query = query.eq('agent_id', agentId);
            }

            // Month-to-date query
            const { data: mtdData, error: mtdError } = await query
                .gte('earned_date', startOfMonth)
                .lte('earned_date', endOfMonth);

            if (mtdError) throw mtdError;

            // Calculate totals
            const pending = mtdData
                ?.filter(c => c.status === 'pending')
                .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

            const approved = mtdData
                ?.filter(c => c.status === 'approved')
                .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

            const paid = mtdData
                ?.filter(c => c.status === 'paid')
                .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

            const total = pending + approved + paid;

            return {
                pending,
                approved,
                paid,
                total,
                mtdEarnings: approved + paid,
            };
        },
        enabled: !!companyId,
        staleTime: 60000,
    });
}

export function useCreateCommission() {
    const queryClient = useQueryClient();
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useMutation({
        mutationFn: async (newCommission: {
            agent_id: string;
            property_id?: string;
            application_id?: string;
            amount: number;
            description?: string;
            earned_date?: string;
        }) => {
            const { data, error } = await supabase
                .from('commissions')
                .insert({
                    ...newCommission,
                    company_id: companyId,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['commissions'] });
            queryClient.invalidateQueries({ queryKey: ['commissions_summary'] });
            toast.success('Commission created');
        },
        onError: (error: any) => {
            toast.error('Failed to create commission: ' + error.message);
        },
    });
}

export function useUpdateCommissionStatus() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async ({ id, status, paid_date }: { id: string; status: string; paid_date?: string }) => {
            const updates: any = { status };
            if (status === 'paid' && !paid_date) {
                updates.paid_date = new Date().toISOString().split('T')[0];
            } else if (paid_date) {
                updates.paid_date = paid_date;
            }

            const { data, error } = await supabase
                .from('commissions')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['commissions'] });
            queryClient.invalidateQueries({ queryKey: ['commissions_summary'] });
            toast.success('Commission status updated');
        },
        onError: (error: any) => {
            toast.error('Failed to update commission: ' + error.message);
        },
    });
}
