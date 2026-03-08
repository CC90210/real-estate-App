'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './useUser';

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

    // Fallback: fetch company directly if profile has company_id but JOIN didn't resolve,
    // OR if the user is authenticated but has NO company_id at all (auto-resolve first company).
    useEffect(() => {
        // Already have a resolved company from the JOIN — nothing to do
        if (company) {
            setFallbackDone(true);
            return;
        }

        // Not authenticated or still loading — skip
        if (!isAuthenticated || userLoading) return;

        if (fetchingRef.current || fallbackDone) return;
        fetchingRef.current = true;

        const supabase = createClient();

        if (profile?.company_id) {
            // Profile has a company_id but JOIN didn't resolve — fetch directly
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
        } else {
            // No company_id on profile — auto-resolve first available company
            // This handles super admins and accounts whose company link was lost
            console.log('[useAuth] No company_id on profile. Auto-resolving first company...');
            supabase
                .from('companies')
                .select('*')
                .limit(1)
                .single()
                .then(({ data, error }) => {
                    if (data) {
                        console.log('[useAuth] Auto-resolved company:', data.name || data.id);
                        setFallbackCompany(data);
                        // Also patch the profile so this is permanent
                        if (profile?.id) {
                            supabase
                                .from('profiles')
                                .update({ company_id: data.id })
                                .eq('id', profile.id)
                                .then(({ error: updateErr }) => {
                                    if (updateErr) {
                                        console.warn('[useAuth] Could not auto-link profile to company:', updateErr.message);
                                    } else {
                                        console.log('[useAuth] Profile permanently linked to company:', data.id);
                                    }
                                });
                        }
                    } else if (error) {
                        console.warn('[useAuth] No companies found:', error.message);
                    }
                })
                .catch(() => {})
                .finally(() => {
                    setFallbackDone(true);
                    fetchingRef.current = false;
                });
        }
    }, [profile?.company_id, profile?.id, company, fallbackDone, isAuthenticated, userLoading]);

    const resolvedCompany = company || fallbackCompany;
    const pendingCompany = isAuthenticated && !resolvedCompany && !fallbackDone;
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
