import { createClient } from '@/lib/supabase/server'
import { normalizeAuthRedirect } from '@/lib/auth-routing'
import { isPasswordRecoveryRedirect, PASSWORD_RECOVERY_COOKIE } from '@/lib/password-recovery'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = requestUrl.origin

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=invalid_auth_callback`)
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !data.session) {
        return NextResponse.redirect(`${origin}/login?error=invalid_auth_callback`)
    }

    const redirectType = (data as typeof data & { redirectType?: string | null }).redirectType
    if (isPasswordRecoveryRedirect(redirectType)) {
        const response = NextResponse.redirect(`${origin}/reset-password`)
        response.cookies.set(PASSWORD_RECOVERY_COOKIE, 'ready', {
            httpOnly: true,
            sameSite: 'lax',
            secure: requestUrl.protocol === 'https:',
            maxAge: 10 * 60,
            path: '/',
        })
        return response
    }

    const redirectTo = normalizeAuthRedirect(requestUrl.searchParams.get('next'))
    return NextResponse.redirect(`${origin}${redirectTo}`)
}
