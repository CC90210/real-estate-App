'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './useUser';
import { useRouter, usePathname } from 'next/navigation';

/**
 * useAuth – the single source of truth for auth + company in the client.
 * Includes auto-redirect for users missing workspace data.
 */
export function useAuth() {
    const router = useRouter();
    const pathname = usePathname();
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

    // Normalize company from profile
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
        if (!profile?.company_id) {
            setFallbackCompany(null);
            setFallbackDone(false);
            fetchingRef.current = false;
            return;
        }

        if (company) {
            setFallbackDone(true);
            return;
        }

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
    const pendingCompany = !!profile?.company_id && !resolvedCompany && !fallbackDone;   
    const isLoading = userLoading || pendingCompany;

    // AUTO-REPAIR REDIRECT
    // If authenticated but no company_id is found, redirect to setup-profile
    useEffect(() => {
        const isSetupPage = pathname === '/setup-profile';
        const isAuthPage = pathname === '/login' || pathname === '/signup';
        const isApi = pathname.startsWith('/api');

        if (!isLoading && isAuthenticated && !profile?.company_id && !isSetupPage && !isAuthPage && !isApi) {
            console.log('[useAuth] Missing company_id. Routing to setup-profile.');
            router.push('/setup-profile');
        }
    }, [isLoading, isAuthenticated, profile?.company_id, pathname, router]);

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
