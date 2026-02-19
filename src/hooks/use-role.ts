'use client'

import { useUser } from '@/lib/hooks/useUser'

export type UserRole = 'admin' | 'agent' | 'landlord'

export interface RolePermissions {
    role: UserRole
    isAdmin: boolean
    isAgent: boolean
    isLandlord: boolean
    isSuperAdmin: boolean
    isLoading: boolean

    // Feature permissions
    canViewAllProperties: boolean
    canViewAreas: boolean
    canViewApprovals: boolean
    canViewAnalytics: boolean
    canViewActivity: boolean
    canViewAutomations: boolean
    canManageTeam: boolean
    canManageBranding: boolean
    canManageBilling: boolean
}

export function useRole(): RolePermissions {
    const { profile, isSuperAdmin: superAdminFlag, isLoading } = useUser()

    const role = (profile?.role || 'agent') as UserRole
    const isSuperAdmin = superAdminFlag

    // Super admins have all permissions
    if (isSuperAdmin) {
        return {
            role: 'admin',
            isAdmin: true,
            isAgent: false,
            isLandlord: false,
            isSuperAdmin: true,
            isLoading,
            canViewAllProperties: true,
            canViewAreas: true,
            canViewApprovals: true,
            canViewAnalytics: true,
            canViewActivity: true,
            canViewAutomations: true,
            canManageTeam: true,
            canManageBranding: true,
            canManageBilling: true,
        }
    }

    return {
        role,
        isAdmin: role === 'admin',
        isAgent: role === 'agent',
        isLandlord: role === 'landlord',
        isSuperAdmin: false,
        isLoading,

        // Admin permissions
        canViewAllProperties: role !== 'landlord',
        canViewAreas: role !== 'landlord',
        canViewApprovals: role !== 'landlord',
        canViewAnalytics: role !== 'landlord',
        canViewActivity: role === 'admin',
        canViewAutomations: role === 'admin',
        canManageTeam: role === 'admin',
        canManageBranding: role === 'admin',
        canManageBilling: role === 'admin',
    }
}
