import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { PASSWORD_RECOVERY_COOKIE } from '@/lib/password-recovery'

export async function GET() {
    const cookieStore = await cookies()
    return NextResponse.json(
        { ready: cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value === 'ready' },
        { headers: { 'Cache-Control': 'no-store' } },
    )
}

export async function POST(request: NextRequest) {
    const cookieStore = await cookies()
    if (cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value !== 'ready') {
        return NextResponse.json({ error: 'Password reset authorization is missing or expired.' }, { status: 403 })
    }

    let password: unknown
    try {
        const body = await request.json() as { password?: unknown }
        password = body.password
    } catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
        return NextResponse.json({ error: 'Password must be between 8 and 128 characters.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        return NextResponse.json({ error: 'Password reset session is invalid or expired.' }, { status: 401 })
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
        return NextResponse.json({ error: 'Unable to update the password. Request a new reset link.' }, { status: 400 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(PASSWORD_RECOVERY_COOKIE, '', { maxAge: 0, path: '/' })
    return response
}
