'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './useUser';

/**
 * useAuth – the single source of truth for auth + company in the client.
 *
 * CRITICAL DESIGN: company resolution has two paths:
 *   1. Profile JOIN (fast – returned inline by useUser's fetchProfile)
 *   2. Fallback direct fetch (when JOIN returns null/empty)
 *
 * `isLoading` stays TRUE until company is resolved OR confirmed missing.
 * This prevents every downstream page from flashing "Unable to load workspace".
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

    const [fallbackCompany, setFallbackCompany] = useState<any>(null);
    const [fallbackDone, setFallbackDone] = useState(false);
    const fetchingRef = useRef(false);

    // Normalize company from profile — Supabase can return as array, object, or null
    const company = useMemo(() => {
        const rawCompany = profile?.company;
        if (!rawCompany) return null;
        if (Array.isArray(rawCompany)) {
            return rawCompany.length > 0 ? rawCompany[0] : null;
        }
        return rawCompany;
    }, [profile?.company]);

    // Fallback: fetch company directly if profile has company_id but JOIN didn't resolve
    useEffect(() => {
        // No profile yet or no company_id → nothing to fetch
        if (!profile?.company_id) {
            setFallbackCompany(null);
            setFallbackDone(false);
            fetchingRef.current = false;
            return;
        }

        // Company already resolved from JOIN → done
        if (company) {
            setFallbackDone(true);
            return;
        }

        // Already fetching or already done → skip
        if (fetchingRef.current || fallbackDone) return;
        fetchingRef.current = true;

        const supabase = createClient();
        supabase
            .from('companies')
            .select('*')
            .eq('id', profile.company_id)
            .single()
            .then(({ data, error }) => {
                if (data) {
                    setFallbackCompany(data);
                } else if (error) {
                    console.warn('[useAuth] Fallback company fetch failed:', error.message);
                }
            })
            .catch(() => {})
            .finally(() => {
                setFallbackDone(true);
                fetchingRef.current = false;
            });
    }, [profile?.company_id, company, fallbackDone]);

    const resolvedCompany = company || fallbackCompany;

    // Compound loading:
    //  - Still loading while UserContext is loading
    //  - Still loading if profile has a company_id but we haven't finished resolving it
    //    (covers the gap between useUser finishing and useEffect running)
    const pendingCompany = !!profile?.company_id && !resolvedCompany && !fallbackDone;
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
