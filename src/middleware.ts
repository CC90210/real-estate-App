import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // Get the session
    const { data: { session } } = await supabase.auth.getSession()

    const pathname = request.nextUrl.pathname

    // Public routes that don't require auth
    // Add landing page "/" to public routes
    const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/pricing', '/features', '/solutions', '/terms', '/privacy']
    const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/join/') || pathname.startsWith('/auth/')

    // Auth callback route
    if (pathname.startsWith('/auth/callback')) {
        return response
    }

    // If no session and trying to access protected route
    if (!session && !isPublicRoute) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
    }

    // If has session and on public route (except home), redirect to dashboard
    if (session && (pathname === '/login' || pathname === '/signup')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // If has session, verify profile exists
    if (session && !isPublicRoute) {
        // Skip profile check for onboarding to avoid loops
        if (pathname.startsWith('/onboarding')) {
            return response
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, company_id')
            .eq('id', session.user.id)
            .single()

        // No profile - redirect to onboarding
        if (!profile) {
            return NextResponse.redirect(new URL('/onboarding', request.url))
        }

        // No company - redirect to onboarding
        if (profile && !profile.company_id) {
            return NextResponse.redirect(new URL('/onboarding', request.url))
        }
    }

    // ==========================================
    // SECURITY HEADERS - ENTERPRISE GRADE
    // ==========================================

    // Prevent clickjacking attacks
    response.headers.set('X-Frame-Options', 'DENY')

    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff')

    // Enable XSS filter
    response.headers.set('X-XSS-Protection', '1; mode=block')

    // Referrer policy - don't leak URLs
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Permissions policy - disable unnecessary browser features
    response.headers.set('Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    )

    // Content Security Policy - strict mode
    // We append the CSP to ensure it doesn't break standard Next.js functionality
    response.headers.set('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://va.vercel-scripts.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https: blob:; " +
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co; " +
        "frame-ancestors 'none';"
    )

    // Strict Transport Security - force HTTPS
    response.headers.set('Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
    )

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         * - api routes
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
    ],
}
