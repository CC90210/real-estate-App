import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * PROPFLOW EDGE INFRASTRUCTURE (V10 - AUTH & SECURITY SYNC)
 * Migrated to proxy.ts as required by production build environment.
 * Handles:
 * 1. Supabase Session Refresh (Server-side)
 * 2. Protected Route Guarding
 * 3. Enterprise Security Headers & CSP
 */

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 1. FAST PATH: Static Assets & Internal Next.js requests
    if (
        pathname.includes('.') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/auth') ||
        pathname === '/favicon.ico'
    ) {
        return applySecurityHeaders(NextResponse.next())
    }

    // 2. SUPABASE AUTH HANDLER
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options })
                    response = NextResponse.next({ request: { headers: request.headers } })
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options })
                    response = NextResponse.next({ request: { headers: request.headers } })
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    // REFRESH SESSION: Vital for SSR consistency
    const { data: { user } } = await supabase.auth.getUser()

    // 3. DEFINE PROTECTION MAP
    const protectedPaths = ['/dashboard', '/properties', '/tenants', '/maintenance', '/settings', '/applications', '/leases', '/financials', '/reports', '/documents']
    const isProtectedRoute = protectedPaths.some(path => pathname.startsWith(path))

    // 4. ROUTE GUARDING
    if (isProtectedRoute && !user) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', pathname)
        return applySecurityHeaders(NextResponse.redirect(redirectUrl))
    }

    // Redirect logged-in users away from auth pages
    const isAuthPage = pathname === '/login' || pathname === '/signup'
    if (isAuthPage && user) {
        return applySecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)))
    }

    return applySecurityHeaders(response)
}

/**
 * Apply Production-Grade Security Headers
 */
function applySecurityHeaders(response: NextResponse) {
    const headers = response.headers

    headers.set('X-Frame-Options', 'DENY')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-XSS-Protection', '1; mode=block')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

    const csp = [
        "default-src 'self' https://*.supabase.co;",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://va.vercel-scripts.com https://*.supabase.co;",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
        "font-src 'self' https://fonts.gstatic.com;",
        "img-src 'self' data: https: blob:;",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com;",
        "frame-src 'self' https://*.supabase.co;",
        "frame-ancestors 'none';",
        "object-src 'none';"
    ].join(' ');

    headers.set('Content-Security-Policy', csp)

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
