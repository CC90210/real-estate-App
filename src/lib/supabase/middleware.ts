
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
    const protectedPaths = ['/dashboard', '/properties', '/tenants', '/maintenance', '/settings', '/applications', '/leases', '/financials', '/reports', '/documents']
    const isProtectedRoute = protectedPaths.some(path => pathname.startsWith(path))

    // ROUTE GUARDING
    if (isProtectedRoute && !user) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
    }

    // Redirect logged-in users away from auth pages
    const isAuthPage = pathname === '/login' || pathname === '/signup'
    if (isAuthPage && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return supabaseResponse
}
