import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * PROPFLOW EDGE INFRASTRUCTURE (V4 - HIGH AVAILABILITY)
 * This middleware is optimized for < 50ms execution time to prevent 504 Gateway Timeouts.
 * Database queries have been completely removed from the Edge runtime.
 * Public routes bypass Supabase network calls entirely.
 */

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // 1. FAST PATH: Ignore static assets that the matcher might have missed
    if (
        pathname.includes('.') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname === '/favicon.ico'
    ) {
        return NextResponse.next()
    }

    // 2. DEFINE PUBLIC ACCESS MAP
    const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/pricing', '/features', '/solutions', '/terms', '/privacy']
    const isPublicRoute = publicRoutes.includes(pathname) ||
        pathname.startsWith('/join/') ||
        pathname.startsWith('/auth/') ||
        pathname.startsWith('/blog')

    // 3. INITIALIZE RESPONSE
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 4. PERFORMANCE OPTIMIZATION: Bypass Supabase for Public Routes
    // Most users entering via propflow.pro will hit this path, ensuring a < 20ms load.
    if (isPublicRoute && pathname !== '/login' && pathname !== '/signup') {
        return applySecurityHeaders(response)
    }

    // 5. SUPABASE AUTH HANDLER (Optimized for Edge)
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

    // Optimized session check (only hits regional Supabase Auth)
    const { data: { session } } = await supabase.auth.getSession()

    // 6. REDIRECTION RULES (Client-side handles profile-specific logic)
    if (!session && !isPublicRoute) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
    }

    if (session && (pathname === '/login' || pathname === '/signup')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return applySecurityHeaders(response)
}

/**
 * Apply Enterprise-Grade Security Headers
 * Optimized for reduced header size and peak privacy.
 */
function applySecurityHeaders(response: NextResponse) {
    const headers = response.headers

    headers.set('X-Frame-Options', 'DENY')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-XSS-Protection', '1; mode=block')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

    // Focused Content Security Policy
    headers.set('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://va.vercel-scripts.com https://*.supabase.co; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https: blob:; " +
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co; " +
        "frame-ancestors 'none';"
    )

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public assets
         */
        '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ico|csv|txt)$).*)',
    ],
}


