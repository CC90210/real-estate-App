import { useMemo } from 'react';
import { useUser } from '@/lib/hooks/useUser';

export function useCompanyId() {
    const { profile, isLoading, isAuthenticated } = useUser();

    return useMemo(() => {
        const companyId = profile?.company_id || null;
        return {
            companyId,
            isLoading: isLoading,
            error: null,
            hasCompany: !!companyId && isAuthenticated
        };
    }, [profile?.company_id, isLoading, isAuthenticated]);
}
