
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // refresh the session
    const { data: { user } } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl

    // DEFINE PROTECTION MAP
    const protectedPaths = [
        '/dashboard', '/properties', '/applications', '/invoices',
        '/documents', '/analytics', '/social', '/settings',
        '/areas', '/approvals', '/leases', '/maintenance',
        '/showings', '/automations', '/activity'
    ]
    const isProtectedRoute = protectedPaths.some(path => pathname.startsWith(path))

    // ROUTE GUARDING
    if (isProtectedRoute && !user) {
        // Only redirect if there are NO session cookies at all.
        // If cookies exist but getUser() failed, it's a transient refresh issue —
        // let the client-side SDK handle the refresh instead of destroying the session.
        const hasSessionCookie = request.cookies.getAll().some(
            c => c.name.startsWith('sb-') && c.name.includes('auth-token')
        );

        if (!hasSessionCookie) {
            // Genuinely no session — redirect to login
            const redirectUrl = new URL('/login', request.url)
            redirectUrl.searchParams.set('redirect', pathname)
            return NextResponse.redirect(redirectUrl)
        }
        // Session cookie exists but getUser failed → transient error → let request through
    }

    // Redirect logged-in users away from auth pages
    const isAuthPage = pathname === '/login' || pathname === '/signup'
    if (isAuthPage && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return supabaseResponse
}
