import { useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

export function useCompanyId() {
    const { company, profile, isLoading, isAuthenticated } = useAuth();

    return useMemo(() => {
        const companyId = company?.id || profile?.company_id || null;
        return {
            companyId,
            isLoading,
            error: null,
            hasCompany: !!companyId && isAuthenticated
        };
    }, [company?.id, profile?.company_id, isLoading, isAuthenticated]);
}
