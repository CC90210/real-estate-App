'use client';

import { useUser } from './useUser';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useAuth() {
    const { user, profile, isLoading: userLoading, isAuthenticated, role, signIn, signUp, signOut } = useUser();
    const supabase = createClient();

    const { data: company, isLoading: companyLoading } = useQuery({
        queryKey: ['company', profile?.company_id],
        queryFn: async () => {
            if (!profile?.company_id) return null;
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .eq('id', profile.company_id)
                .single();

            if (error) return null;
            return data;
        },
        enabled: !!profile?.company_id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        user,
        profile,
        company,
        role,
        isLoading: userLoading || companyLoading,
        isAuthenticated,
        signIn,
        signUp,
        signOut
    };
}
