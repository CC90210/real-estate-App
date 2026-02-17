'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types/database';
import { User } from '@supabase/supabase-js';
import { PLANS, PlanId } from '@/lib/plans';

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
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<(Profile & { company?: any }) | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const calculatePlan = useCallback((profileData: any) => {
        if (!profileData) return { plan: 'essentials' as PlanId, planName: 'Essentials', features: PLANS.essentials.features, hasFullAccess: false };

        const isSuperAdmin = !!profileData.is_super_admin;
        const isPartner = !!profileData.is_partner;
        const company = profileData.company;
        const isLifetime = company?.is_lifetime_access === true;

        const hasFullAccess = isSuperAdmin || isPartner || isLifetime;

        const planId = hasFullAccess ? 'enterprise' : (company?.subscription_plan || 'essentials') as PlanId;
        const planConfig = PLANS[planId] || PLANS.essentials;

        return {
            plan: planId,
            planName: isLifetime ? 'Enterprise (Lifetime)' : planConfig.name,
            features: planConfig.features as Record<string, boolean>,
            hasFullAccess
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            // FAST PATH: Single query for profile and company
            const { data, error } = await supabase
                .from('profiles')
                .select('*, company:companies(*)')
                .eq('id', userId)
                .single();

            if (error) {
                // Detect RLS recursion error — this is the critical error we're fixing
                if (error.message?.includes('recursion') || error.message?.includes('infinite')) {
                    console.error('[CRITICAL] RLS recursion detected on profiles table. Run the emergency SQL fix in Supabase SQL Editor.');
                    console.error('See: supabase_emergency_rls_fix.sql');
                }
                console.warn('Profile sync issue:', error.message);
                return null;
            }

            if (!data) {
                console.warn('Profile not found for user:', userId);
                return null;
            }

            return data;
        } catch (err) {
            // Catch any unexpected errors to prevent app crash
            console.error('Profile fetch failed unexpectedly:', err);
            return null;
        }
    };

    const refreshProfile = async () => {
        if (user) {
            const profileData = await fetchProfile(user.id);
            setProfile(profileData);
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                const currentUser = session.user;
                setUser(currentUser);

                // Fetch profile with a small delay to ensure triggers have finished if it's a new signup
                const profileData = await fetchProfile(currentUser.id);
                setProfile(profileData);

                // Auto-onboarding redirect for logged-in users with no profile
                const path = window.location.pathname;
                const isNavigatingAuth = path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/auth') || path.startsWith('/join');

                if (!profileData && !path.startsWith('/onboarding') && !isNavigatingAuth) {
                    window.location.href = '/onboarding';
                }
            }
            setIsLoading(false);
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    setUser(session.user);
                    const profileData = await fetchProfile(session.user.id);
                    setProfile(profileData);
                } else {
                    setUser(null);
                    setProfile(null);
                }
                setIsLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        return await supabase.auth.signInWithPassword({ email, password });
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

            return await supabase.auth.signInWithPassword({ email, password });
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

    const planStats = calculatePlan(profile);

    return (
        <UserContext.Provider value={{
            user,
            profile,
            isLoading,
            isAuthenticated: !!user,
            role: profile?.role || null,
            isSuperAdmin: !!profile?.is_super_admin,
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
