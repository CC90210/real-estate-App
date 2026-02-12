import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * PROPFLOW EDGE INFRASTRUCTURE (V6 - PRODUCTION HARDENED)
 * Optimized for Zero-Blocking and maximum security without "Failed to Fetch" errors.
 */

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // 1. FAST PATH: Static Assets & Internal Next.js requests
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

    // 4. PERFORMANCE OPTIMIZATION: Bypassing session checks for ALL public routes
    if (isPublicRoute) {
        return applySecurityHeaders(response)
    }

    // 5. SUPABASE AUTH HANDLER (ONLY for protected routes)
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

    const { data: { session } } = await supabase.auth.getSession()

    // 6. PROTECTED ROUTE REDIRECTION
    if (!session) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
    }

    return applySecurityHeaders(response)
}

/**
 * Apply Production-Grade Security Headers
 * Fixes "Failed to fetch" by allowing Supabase communication properly.
 */
function applySecurityHeaders(response: NextResponse) {
    const headers = response.headers

    headers.set('X-Frame-Options', 'DENY')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-XSS-Protection', '1; mode=block')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

    // HARDENED CONTENT SECURITY POLICY
    // Added Supabase to default-src and clarified connect-src to resolve fetch errors
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
        '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ico|csv|txt)$).*)',
    ],
}
