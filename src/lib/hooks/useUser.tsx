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
        let { data, error } = await supabase
            .from('profiles')
            .select('*, company:companies(*)')
            .eq('id', userId)
            .single();

        if (error || !data) {
            console.warn('Profile missing or error fetching, attempting repair...', error);
            const { error: repairError } = await supabase.rpc('ensure_user_profile');

            if (!repairError) {
                const { data: refetched, error: refetchError } = await supabase
                    .from('profiles')
                    .select('*, company:companies(*)')
                    .eq('id', userId)
                    .single();

                if (!refetchError && refetched) {
                    return refetched;
                }
            }
            return null;
        }

        return data;
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
                setUser(session.user);
                const profileData = await fetchProfile(session.user.id);
                setProfile(profileData);

                // Auto-onboarding redirect for logged-in users with no profile
                // Only if NOT already on onboarding or sign-in pages
                const path = window.location.pathname;
                if (!profileData && !path.startsWith('/onboarding') && !path.startsWith('/login') && !path.startsWith('/auth')) {
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
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
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

            const { error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            return { error: loginError };
        } catch (e: any) {
            return { error: e };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
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
