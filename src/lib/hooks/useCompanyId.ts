'use client';

import { useUser } from '@/lib/hooks/useUser';

/**
 * useCompanyId is now a shortcut to the global UserContext 
 * to provide instant access to the company ID without extra database hits.
 */
export function useCompanyId() {
    const { profile, isLoading, isAuthenticated } = useUser();

    const companyId = profile?.company_id || null;

    return {
        companyId,
        isLoading: isLoading,
        error: null,
        hasCompany: !!companyId && isAuthenticated
    };
}
