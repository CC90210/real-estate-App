import { createClient } from '@/lib/supabase/server'
import { normalizeAuthRedirect } from '@/lib/auth-routing'
import { isPasswordRecoveryRedirect, PASSWORD_RECOVERY_COOKIE } from '@/lib/password-recovery'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const tokenHash = requestUrl.searchParams.get('token_hash')
    const verificationType = requestUrl.searchParams.get('type')
    const origin = requestUrl.origin
    const supabase = await createClient()

    if (tokenHash && verificationType === 'recovery') {
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
        })

        if (error || !data.session) {
            return NextResponse.redirect(`${origin}/login?error=invalid_auth_callback`)
        }

        return passwordRecoveryResponse(requestUrl)
    }

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=invalid_auth_callback`)
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !data.session) {
        return NextResponse.redirect(`${origin}/login?error=invalid_auth_callback`)
    }

    const redirectType = (data as typeof data & { redirectType?: string | null }).redirectType
    if (isPasswordRecoveryRedirect(redirectType)) {
        return passwordRecoveryResponse(requestUrl)
    }

    const redirectTo = normalizeAuthRedirect(requestUrl.searchParams.get('next'))
    return NextResponse.redirect(`${origin}${redirectTo}`)
}

function passwordRecoveryResponse(requestUrl: URL) {
    const response = NextResponse.redirect(`${requestUrl.origin}/reset-password`)
    response.cookies.set(PASSWORD_RECOVERY_COOKIE, 'ready', {
        httpOnly: true,
        sameSite: 'lax',
        secure: requestUrl.protocol === 'https:',
        maxAge: 10 * 60,
        path: '/',
    })
    return response
}
