'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database';
import { User } from '@supabase/supabase-js';
import { PLANS, PlanId } from '@/lib/plans';

// ─── Hardcoded super admin emails ───────────────────────────────
// These ALWAYS get full enterprise access regardless of database state
const SUPER_ADMIN_EMAILS = ['konamak@icloud.com'];

function isSuperAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    return SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

interface UserContextType {
    user: User | null;
    profile: (Profile & { company?: any }) | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    role: UserRole | null;
    isSuperAdmin: boolean;
    isPartner: boolean;
    hasFullAccess: boolean;
    plan: PlanId;
    planName: string;
    features: Record<string, boolean>;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, fullName: string, role: UserRole, companyName?: string, jobTitle?: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    // Use the SSR-aware client (same one the rest of the app uses)
    const supabase = useMemo(() => createClient(), []);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<(Profile & { company?: any }) | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const calculatePlan = useCallback((profileData: any, userEmail?: string | null) => {
        const isHardcodedAdmin = isSuperAdminEmail(userEmail);

        // If no profile but is hardcoded admin → full access
        if (!profileData) {
            if (isHardcodedAdmin) {
                return { plan: 'enterprise' as PlanId, planName: '🔑 Super Admin', features: PLANS.enterprise.features, hasFullAccess: true };
            }
            return { plan: 'essentials' as PlanId, planName: 'Essentials', features: PLANS.essentials.features, hasFullAccess: false };
        }

        const isSuperAdmin = !!profileData.is_super_admin || isHardcodedAdmin;
        const isPartner = !!profileData.is_partner;

        // Normalize company — Supabase can return as array or object
        const rawCompany = profileData.company;
        const company = rawCompany
            ? (Array.isArray(rawCompany) ? rawCompany[0] : rawCompany)
            : null;
        const isLifetime = company?.is_lifetime_access === true;

        const hasFullAccess = isSuperAdmin || isPartner || isLifetime;

        const planId = hasFullAccess ? 'enterprise' : (company?.subscription_plan || 'essentials') as PlanId;
        const planConfig = PLANS[planId] || PLANS.essentials;

        return {
            plan: planId,
            planName: isSuperAdmin ? '🔑 Super Admin' : isLifetime ? 'Enterprise (Lifetime)' : planConfig.name,
            features: planConfig.features as Record<string, boolean>,
            hasFullAccess
        };
    }, []);

    const fetchProfile = useCallback(async (userId: string) => {
        try {
            // Reduced timeout: 5s instead of 8s to avoid racing with the 10s safety timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, email, role, company_id, avatar_url, is_super_admin, is_partner, job_title')
                .eq('id', userId)
                .single()
                .abortSignal(controller.signal);

            let companyData = null;
            if (profileData?.company_id && !profileError) {
                const { data: comp } = await supabase
                    .from('companies')
                    .select('id, name, subscription_plan, subscription_status, is_lifetime_access, late_profile_id')
                    .eq('id', profileData.company_id)
                    .single()
                    .abortSignal(controller.signal);
                companyData = comp;
            }

            clearTimeout(timeout);

            if (profileError) {
                if (profileError.message?.includes('recursion') || profileError.message?.includes('infinite') || profileError.message?.includes('policy')) {
                    console.error('[CRITICAL] RLS recursion detected on profiles table.');
                    return {
                        id: userId,
                        email: null,
                        company_id: 'pending',
                        role: 'admin',
                        _rlsError: true,
                    } as any;
                }
                console.warn('Profile sync issue:', profileError.message);
                return null;
            }

            if (!profileData) {
                console.warn('Profile not found for user:', userId);
                return null;
            }

            return { ...profileData, company: companyData };


        } catch (err: any) {
            // Handle abort (timeout)
            if (err?.name === 'AbortError') {
                console.warn('Profile fetch timed out for user:', userId);
                return null;
            }
            console.error('Profile fetch failed unexpectedly:', err);
            return null;
        }
    }, [supabase]);

    const refreshProfile = useCallback(async () => {
        if (user) {
            const profileData = await fetchProfile(user.id);
            setProfile(profileData);
        }
    }, [user, fetchProfile]);

    useEffect(() => {
        let mounted = true;
        let initialSessionHandled = false;

        // Safety timeout: ALWAYS stop loading after 10 seconds no matter what
        const safetyTimeout = setTimeout(() => {
            if (mounted && isLoading) {
                console.warn('[Auth] Safety timeout: forcing isLoading=false after 10s');
                setIsLoading(false);
            }
        }, 10000);

        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user && mounted) {
                    // Set user immediately so the app knows we are authenticated
                    setUser(session.user);

                    // Then fetch profile
                    const profileData = await fetchProfile(session.user.id);
                    if (mounted) {
                        setProfile(profileData);
                    }
                }
            } catch (err) {
                console.error('Auth initialization failed:', err);
            } finally {
                if (mounted) {
                    setIsLoading(false);
                    initialSessionHandled = true;
                }
            }
        };

        // Call initAuth immediately
        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                // Skip the INITIAL_SESSION event — initAuth already handles it
                if (event === 'INITIAL_SESSION') return;

                if (session?.user) {
                    setUser(session.user);
                    // Only re-fetch profile on actual auth changes, not initial load
                    if (initialSessionHandled) {
                        const profileData = await fetchProfile(session.user.id);
                        if (mounted) setProfile(profileData);
                    }
                } else {
                    setUser(null);
                    setProfile(null);
                }
                setIsLoading(false);
            }
        );

        return () => {
            mounted = false;
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, [supabase, fetchProfile]);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error ? new Error(error.message) : null };
    };

    const signUp = async (email: string, password: string, fullName: string, role: UserRole, companyName?: string, jobTitle?: string) => {
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-name': companyName || 'Default Company'
                },
                body: JSON.stringify({
                    email,
                    password,
                    full_name: fullName,
                    role,
                    job_title: jobTitle
                })
            });

            const data = await res.json();
            if (!res.ok) return { error: new Error(data.error || 'Signup failed') };

            const { error } = await supabase.auth.signInWithPassword({ email, password });
            return { error: error ? new Error(error.message) : null };
        } catch (e: any) {
            return { error: e };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        window.location.href = '/';
    };

    // ─── Compute plan and access ────────────────────────────────
    const planStats = calculatePlan(profile, user?.email);
    const hardcodedAdmin = isSuperAdminEmail(user?.email);

    return (
        <UserContext.Provider value={{
            user,
            profile,
            isLoading,
            isAuthenticated: !!user,
            role: profile?.role || null,
            isSuperAdmin: !!profile?.is_super_admin || hardcodedAdmin,
            isPartner: !!profile?.is_partner,
            hasFullAccess: planStats.hasFullAccess,
            plan: planStats.plan,
            planName: planStats.planName,
            features: planStats.features,
            signIn,
            signUp,
            signOut,
            refreshProfile
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
