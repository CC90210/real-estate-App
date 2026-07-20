import { isProtectedPath } from '@/lib/auth-routes'

/**
 * Keep post-auth navigation inside PropFlow and avoid redirect loops.
 * Search params are untrusted input, even when they came from our proxy.
 */
export function normalizeAuthRedirect(value: string | null | undefined): string {
    const fallback = '/dashboard'
    const localOrigin = 'https://propflow.invalid'

    if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
        return fallback
    }

    let target: URL
    try {
        target = new URL(value, localOrigin)
    } catch {
        return fallback
    }

    if (target.origin !== localOrigin) return fallback

    const { pathname } = target
    if (pathname.startsWith('//') || !isProtectedPath(pathname)) return fallback

    return `${pathname}${target.search}${target.hash}`
}
