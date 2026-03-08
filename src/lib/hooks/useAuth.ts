'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './useUser';

/**
 * useAuth is a refined hook that provides instant access to the authenticated state,
 * user details, profile, company data, and plan-level attributes.
 *
 * CRITICAL: This hook manages a compound loading state that accounts for:
 * 1. UserContext loading (session + profile fetch)
 * 2. Fallback company fetch (when profile JOIN doesn't return company data)
 *
 * Without the compound loading state, pages would see isLoading=false + company=null
 * and render "Unable to load workspace data" before the fallback fetch completes.
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
    const [fallbackLoading, setFallbackLoading] = useState(false);
    const [fallbackAttempted, setFallbackAttempted] = useState(false);

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
        // Reset fallback state when profile changes (e.g. user switches accounts)
        if (!profile?.company_id) {
            setFallbackCompany(null);
            setFallbackLoading(false);
            setFallbackAttempted(false);
            return;
        }

        // If company already resolved from JOIN, no fallback needed
        if (company) {
            setFallbackLoading(false);
            return;
        }

        // Don't re-attempt if we already tried (prevents infinite loop)
        if (fallbackAttempted) return;

        setFallbackLoading(true);
        setFallbackAttempted(true);

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
                setFallbackLoading(false);
            })
            .catch(() => {
                setFallbackLoading(false);
            });
    }, [profile?.company_id, company, fallbackAttempted]);

    const resolvedCompany = company || fallbackCompany;

    // Compound loading state:
    // - Still loading if UserContext is loading
    // - Still loading if we have a company_id but haven't resolved company yet (fallback in progress)
    const needsCompanyResolution = !!profile?.company_id && !resolvedCompany && fallbackLoading;
    const isLoading = userLoading || needsCompanyResolution;

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
