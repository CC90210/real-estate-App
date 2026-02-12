import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * PROPFLOW EDGE INFRASTRUCTURE (V7 - EMERGENCY RECOVERY)
 * Middleware is completely stripped to avoid ANY interference with auth.
 */

export async function middleware(request: NextRequest) {
    return NextResponse.next()
}

export const config = {
    matcher: ['/dashboard/:path*', '/admin/:path*'], // Only run on internal routes
}
