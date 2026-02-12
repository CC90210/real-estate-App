import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * PROPFLOW EDGE INFRASTRUCTURE (V7 - TOTAL STABILITY)
 * This version prioritizes functional stability over restrictive security.
 * Restrictive CSPs have been removed to resolve "Failed to fetch" errors.
 * Performance is optimized by skipping database/auth checks for all public routes.
 */

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 1. SKIP logic for assets
    if (
        pathname.includes('.') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname === '/favicon.ico'
    ) {
        return NextResponse.next()
    }

    // 2. DEFINE PUBLIC ACCESS
    const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/pricing', '/features', '/solutions', '/terms', '/privacy']
    const isPublicRoute = publicRoutes.includes(pathname) ||
        pathname.startsWith('/join/') ||
        pathname.startsWith('/auth/') ||
        pathname.startsWith('/blog')

    // 3. PERFORMANCE: Bypass all middleware logic for public routes
    // This ensures no 504 timeouts and no "Failed to fetch" due to CSP.
    if (isPublicRoute) {
        return NextResponse.next()
    }

    // 4. SUPABASE AUTH HANDLER (ONLY for protected routes e.g. /dashboard)
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

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

    // Run session check ONLY for protected routes
    const { data: { session } } = await supabase.auth.getSession()

    // 5. PROTECTED ROUTE REDIRECTION
    if (!session) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ico|csv|txt)$).*)',
    ],
}
