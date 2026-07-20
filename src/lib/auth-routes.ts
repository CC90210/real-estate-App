export const PROTECTED_ROUTE_PREFIXES = [
    '/dashboard',
    '/properties',
    '/applicants',
    '/applications',
    '/invoices',
    '/documents',
    '/analytics',
    '/social',
    '/settings',
    '/areas',
    '/approvals',
    '/leases',
    '/maintenance',
    '/showings',
    '/automations',
    '/activity',
    '/inspections',
    '/communication',
    '/admin',
    '/tenant',
    '/landlord',
    '/landlords',
    '/onboarding',
] as const

export function isProtectedPath(pathname: string): boolean {
    return PROTECTED_ROUTE_PREFIXES.some(
        path => pathname === path || pathname.startsWith(`${path}/`),
    )
}
