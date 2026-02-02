'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useCompanyId } from './useCompanyId';

export interface AutomationLog {
    id: string;
    action_type: string;
    entity_type: string;
    entity_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    triggered_at: string;
    completed_at?: string;
    error_message?: string;
    result?: any;
}

export interface AutomationSubscription {
    id: string;
    is_active: boolean;
    features: {
        email_outbound: boolean;
        social_posting: boolean;
        ad_generation: boolean;
        bulk_actions: boolean;
    };
}

export function useAutomationSubscription() {
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useQuery({
        queryKey: ['automation_subscription', companyId],
        queryFn: async () => {
            // In a real app, we might create a default sub if none exists, or handle 404.
            // Here we try to fetch.
            const { data, error } = await supabase
                .from('automation_subscriptions')
                .select('*')
                .eq('company_id', companyId)
                .single();

            if (error) {
                // Return null if not found (not active) is safer than throwing for UI logic
                return null;
            }
            return data as AutomationSubscription;
        },
        enabled: !!companyId,
    });
}

export function useAutomationLogs(entityId?: string) {
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useQuery({
        queryKey: ['automation_logs', companyId, entityId],
        queryFn: async () => {
            let query = supabase
                .from('automation_logs')
                .select('*')
                .eq('company_id', companyId)
                .order('triggered_at', { ascending: false });

            if (entityId) {
                query = query.eq('entity_id', entityId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as AutomationLog[];
        },
        enabled: !!companyId,
    });
}
