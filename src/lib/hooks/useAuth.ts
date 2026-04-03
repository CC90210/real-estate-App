'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './useUser';
import type { Company } from '@/types/database';

type CompanyRecord = Partial<Company> & {
    id: string;
    name?: string;
};
type FallbackCompanyState = {
    userId: string | null;
    company: CompanyRecord | null;
};

/**
 * useAuth – the single source of truth for auth + company in the client.
 * If the user's profile has no company_id (e.g. super admin whose profile
 * wasn't linked), we auto-resolve the first available company so every
 * page that depends on company.id keeps working.
 */
export function useAuth() {
    const {
        user,
        profile,
        isLoading: userLoading,
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

    const [fallbackState, setFallbackState] = useState<FallbackCompanyState>({
        userId: null,
        company: null,
    });
    const fetchingRef = useRef(false);

    // Normalize company from profile
    const company = useMemo(() => {
        const rawCompany = profile?.company;
        if (!rawCompany) return null;
        if (Array.isArray(rawCompany)) {
            return rawCompany.length > 0 ? rawCompany[0] : null;
        }
        return rawCompany;
    }, [profile?.company]);

    // Fallback: fetch company directly if profile has company_id but JOIN didn't resolve,
    // OR if the user is authenticated but has NO company_id at all (auto-resolve first company).
    useEffect(() => {
        if (company || !profile?.company_id || !isAuthenticated || userLoading || !user?.id) {
            return;
        }

        if (fetchingRef.current || fallbackState.userId === user.id) {
            return;
        }

        fetchingRef.current = true;

        const supabase = createClient();

        supabase
            .from('companies')
            .select('*')
            .eq('id', profile.company_id)
            .maybeSingle()
            .then(({ data, error }) => {
                if (data) {
                    setFallbackState({
                        userId: user.id,
                        company: data as CompanyRecord,
                    });
                } else {
                    if (error) {
                        console.warn('[useAuth] Fallback company fetch failed:', error.message);
                    }
                    setFallbackState({
                        userId: user.id,
                        company: null,
                    });
                }
            })
            .catch(() => {
                setFallbackState({
                    userId: user.id,
                    company: null,
                });
            })
            .finally(() => {
                fetchingRef.current = false;
            });
    }, [company, fallbackState.userId, isAuthenticated, profile?.company_id, user?.id, userLoading]);

    const resolvedCompany = company || (fallbackState.userId === user?.id ? fallbackState.company : null);
    const pendingCompany = isAuthenticated && !!profile?.company_id && !company && fallbackState.userId !== user?.id;
    const isLoading = userLoading || pendingCompany;

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
