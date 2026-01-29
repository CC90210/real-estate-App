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

// MOCK DATA FOR DEMO MODE
const MOCK_PROFILES: Record<string, Profile> = {
    'admin@example.com': {
        id: 'mock-admin-id',
        email: 'admin@example.com',
        full_name: 'Admin User',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    'agent@example.com': {
        id: 'mock-agent-id',
        email: 'agent@example.com',
        full_name: 'Agent User',
        role: 'agent',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    'landlord@example.com': {
        id: 'mock-landlord-id',
        email: 'landlord@example.com',
        full_name: 'Landlord User',
        role: 'landlord',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
};

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('mock');

    const fetchProfile = async (userId: string) => {
        if (isDemoMode) {
            // Try to find if we have a stored mock profile
            if (userId.startsWith('mock-')) {
                const mockEmail = Object.keys(MOCK_PROFILES).find(key => MOCK_PROFILES[key].id === userId);
                if (mockEmail) return MOCK_PROFILES[mockEmail];
            }
            return null;
        }

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
            // Check for mock session in localStorage if in demo mode
            if (isDemoMode) {
                const storedUser = localStorage.getItem('propflow_mock_user');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    const profileData = await fetchProfile(parsedUser.id);
                    setProfile(profileData);
                }
                setIsLoading(false);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                setUser(session.user);
                const profileData = await fetchProfile(session.user.id);
                setProfile(profileData);
            }

            setIsLoading(false);
        };

        initAuth();

        if (!isDemoMode) {
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
        }
    }, [isDemoMode]);

    const signIn = async (email: string, password: string) => {
        if (isDemoMode) {
            // Simulate login
            const mockProfile = MOCK_PROFILES[email];
            if (mockProfile) {
                const mockUser: User = {
                    id: mockProfile.id,
                    aud: 'authenticated',
                    role: 'authenticated',
                    email: email,
                    email_confirmed_at: new Date().toISOString(),
                    phone: '',
                    app_metadata: { provider: 'email', providers: ['email'] },
                    user_metadata: {},
                    identities: [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                setUser(mockUser);
                setProfile(mockProfile);
                localStorage.setItem('propflow_mock_user', JSON.stringify(mockUser));
                return { error: null };
            } else {
                // Allow generic login for demo if email not in mock list, default to Agent
                const genericMockId = 'mock-generic-' + Date.now();
                const genericUser: User = {
                    id: genericMockId,
                    aud: 'authenticated',
                    role: 'authenticated',
                    email: email,
                    email_confirmed_at: new Date().toISOString(),
                    phone: '',
                    app_metadata: { provider: 'email', providers: ['email'] },
                    user_metadata: {},
                    identities: [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                const genericProfile: Profile = {
                    id: genericMockId,
                    email: email,
                    full_name: 'Demo User',
                    role: 'agent',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                setUser(genericUser);
                setProfile(genericProfile);
                localStorage.setItem('propflow_mock_user', JSON.stringify(genericUser));
                // We also need to add this to MOCK_PROFILES temporarily so fetchProfile works on reload? 
                // For simple localStorage implementation above, we rely on checking userId.startsWith('mock-').
                // Actually the above fetchProfile implementation for demo mode only checks MOCK_PROFILES. 
                // Let's dynamic add it to ensure consistency or just pass profile directly.
                // For simplicity:
                MOCK_PROFILES[email] = genericProfile;

                return { error: null };
            }
        }

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        return { error };
    };

    const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
        if (isDemoMode) {
            // Simulate signup
            const mockId = 'mock-' + Date.now();
            const mockUser: User = {
                id: mockId,
                aud: 'authenticated',
                role: 'authenticated',
                email: email,
                email_confirmed_at: new Date().toISOString(),
                phone: '',
                app_metadata: { provider: 'email', providers: ['email'] },
                user_metadata: {},
                identities: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            const mockProfile: Profile = {
                id: mockId,
                email,
                full_name: fullName,
                role,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            setUser(mockUser);
            setProfile(mockProfile);
            localStorage.setItem('propflow_mock_user', JSON.stringify(mockUser));
            MOCK_PROFILES[email] = mockProfile;

            return { error: null };
        }

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
        if (isDemoMode) {
            setUser(null);
            setProfile(null);
            localStorage.removeItem('propflow_mock_user');
            return;
        }
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    return (
        <UserContext.Provider value={{ user, profile, isLoading, isAuthenticated: !!user, role: profile?.role || null, signIn, signUp, signOut, refreshProfile }}>
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
