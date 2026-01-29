'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types/database';
import { User } from '@supabase/supabase-js';

interface UserContextType {
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    role: UserRole | null;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }

        return data as Profile;
    };

    const refreshProfile = async () => {
        if (user) {
            const profileData = await fetchProfile(user.id);
            setProfile(profileData);
        }
    };

    useEffect(() => {
        // Get initial session
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                setUser(session.user);
                const profileData = await fetchProfile(session.user.id);
                setProfile(profileData);
            }

            setIsLoading(false);
        };

        initAuth();

        // Listen for auth changes
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

    const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) return { error };

        // Create profile
        if (data.user) {
            const { error: profileError } = await supabase.from('profiles').insert({
                id: data.user.id,
                email,
                full_name: fullName,
                role,
            });

            if (profileError) {
                return { error: new Error(profileError.message) };
            }
        }

        return { error: null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    return (
        <UserContext.Provider value= {{
        user,
            profile,
            isLoading,
            isAuthenticated: !!user,
                role: profile?.role || null,
                    signIn,
                    signUp,
                    signOut,
                    refreshProfile,
        }
}>
    { children }
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
