'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useCompanyId() {
    const supabase = createClient();

    const { data: companyId, isLoading, error } = useQuery({
        queryKey: ['company_id'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            return profile?.company_id || null;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes - company rarely changes
        gcTime: 10 * 60 * 1000,
    });

    return {
        companyId,
        isLoading,
        error,
        hasCompany: !!companyId
    };
}
