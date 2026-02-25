'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './useUser';

/**
 * useAuth is a refined hook that provides instant access to the authenticated state,
 * user details, profile, company data, and plan-level attributes.
 * It is a thin consumer of UserContext, ensuring peak performance.
 */
export function useAuth() {
    const {
        user,
        profile,
        isLoading,
        isAuthenticated,
        role,
        isSuperAdmin,
        isPartner,
        hasFullAccess,
        plan,
        planName,
        signIn,
        signUp,
        signOut
    } = useUser();

    const [fallbackCompany, setFallbackCompany] = useState<any>(null);

    const rawCompany = profile?.company;
    const company = rawCompany
        ? (Array.isArray(rawCompany) ? rawCompany[0] : rawCompany)
        : null;

    useEffect(() => {
        if (profile?.company_id && !company && !fallbackCompany) {
            const supabase = createClient();
            supabase
                .from('companies')
                .select('*')
                .eq('id', profile.company_id)
                .single()
                .then(({ data }) => {
                    if (data) setFallbackCompany(data);
                });
        }
    }, [profile?.company_id, company, fallbackCompany]);

    const resolvedCompany = company || fallbackCompany;

    return {
        user,
        profile,
        company: resolvedCompany,
        role,
        isSuperAdmin,
        isPartner,
        hasFullAccess,
        plan,
        planName,
        isLoading,
        isAuthenticated,
        signIn,
        signUp,
        signOut
    };
}
