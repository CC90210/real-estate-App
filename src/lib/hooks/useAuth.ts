'use client';

import { useUser } from './useUser';

/**
 * useAuth is a refined hook that provides instant access to the authenticated state,
 * user details, profile, company data, and plan-level attributes.
 * It is a thin consumer of UserContext, ensuring peak performance.
 */
export function useAuth() {
    const {
        user,
        profile,
        isLoading,
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

    // Normalize company data: Supabase join can return array or object
    const rawCompany = profile?.company;
    const company = rawCompany
        ? (Array.isArray(rawCompany) ? rawCompany[0] : rawCompany)
        : null;

    return {
        user,
        profile,
        company,
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
