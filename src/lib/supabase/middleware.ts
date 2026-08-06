
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isProtectedPath } from '@/lib/auth-routes'
import { verifySessionEdge } from './turso-auth-edge'

/** Endpoints that must never be session-gated: the login POST cannot require a
 *  session (chicken-and-egg), and the data bridge answers 401 itself so the
 *  client sees a proper error shape instead of an HTML redirect. */
const TURSO_PUBLIC_API = [
    '/api/auth/turso-login',
    '/api/auth/turso-me',
    '/api/data/bridge',
    '/api/data/rpc',
]

export async function updateSession(request: NextRequest) {
    const { pathname: earlyPath } = request.nextUrl

    // Turso auth mode: our HMAC cookie is the session. Verified inline at the
    // Edge (Web Crypto), no Supabase round trip. Route-protection decisions
    // still come from isProtectedPath so both modes share one source of truth.
    if (process.env.EMPIRE_AUTH_BACKEND === 'turso' && process.env.AUTH_SESSION_SECRET) {
        if (TURSO_PUBLIC_API.some((p) => earlyPath.startsWith(p))) {
            return NextResponse.next({ request })
        }
        if (!isProtectedPath(earlyPath)) {
            return NextResponse.next({ request })
        }
        const session = await verifySessionEdge(
            request.cookies.get('propflow_session')?.value,
            process.env.AUTH_SESSION_SECRET,
        )
        if (session) return NextResponse.next({ request })
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('next', earlyPath)
        return NextResponse.redirect(url)
    }

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
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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
    // PUBLIC TOKEN ROUTES (no auth required):
    //   /sign/[token]          — tenant document signing
    //   /join/[token]          — team invitation acceptance
    //   /join/platform/[token] — platform signup via invite
    //   /pricing, /login, /signup, /forgot-password, /reset-password
    //
    // These are NOT in protectedPaths and must NEVER be added.
    const isProtectedRoute = isProtectedPath(pathname)

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
