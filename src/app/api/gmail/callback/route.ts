import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { google } from 'googleapis'

export async function GET(req: NextRequest) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    try {
        const url = new URL(req.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const error = url.searchParams.get('error')

        // Handle user denial on the Google consent screen
        if (error) {
            return NextResponse.redirect(`${appUrl}/settings/automations?gmail=error&reason=${encodeURIComponent(error)}`)
        }

        if (!code) {
            return NextResponse.redirect(`${appUrl}/settings/automations?gmail=error&reason=missing_code`)
        }

        // Validate CSRF state
        const cookieStore = await cookies()
        const storedState = cookieStore.get('gmail_oauth_state')?.value

        if (!storedState || storedState !== state) {
            return NextResponse.redirect(`${appUrl}/settings/automations?gmail=error&reason=invalid_state`)
        }

        // Clear the state cookie immediately after validating
        cookieStore.delete('gmail_oauth_state')

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.redirect(`${appUrl}/login`)
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return NextResponse.redirect(`${appUrl}/settings/automations?gmail=error&reason=no_company`)
        }

        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET

        if (!clientId || !clientSecret) {
            return NextResponse.redirect(`${appUrl}/settings/automations?gmail=error&reason=not_configured`)
        }

        const redirectUri = `${appUrl}/api/gmail/callback`
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

        // Exchange the authorization code for tokens
        const { tokens } = await oauth2Client.getToken(code)

        if (!tokens.access_token) {
            return NextResponse.redirect(`${appUrl}/settings/automations?gmail=error&reason=no_token`)
        }

        // Fetch the authenticated user's email address from Google
        oauth2Client.setCredentials(tokens)
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
        const { data: userInfo } = await oauth2.userinfo.get()

        if (!userInfo.email) {
            return NextResponse.redirect(`${appUrl}/settings/automations?gmail=error&reason=no_email`)
        }

        const tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
        const scopes = tokens.scope ? tokens.scope.split(' ') : []

        // Check if this Gmail account is already connected for this company; if so, update it
        const { data: existing } = await supabase
            .from('gmail_oauth_tokens')
            .select('id')
            .eq('company_id', profile.company_id)
            .eq('email', userInfo.email)
            .maybeSingle()

        if (existing) {
            const { error: updateError } = await supabase
                .from('gmail_oauth_tokens')
                .update({
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token ?? null,
                    token_expiry: tokenExpiry,
                    scopes,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)

            if (updateError) {
                return NextResponse.redirect(`${appUrl}/settings/automations?gmail=error&reason=db_update_failed`)
            }
        } else {
            // Determine whether this should be the primary account (first connected = primary)
            const { count } = await supabase
                .from('gmail_oauth_tokens')
                .select('id', { count: 'exact', head: true })
                .eq('company_id', profile.company_id)

            const isPrimary = (count ?? 0) === 0

            const { error: insertError } = await supabase
                .from('gmail_oauth_tokens')
                .insert({
                    company_id: profile.company_id,
                    user_id: user.id,
                    email: userInfo.email,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token ?? null,
                    token_expiry: tokenExpiry,
                    scopes,
                    is_primary: isPrimary,
                })

            if (insertError) {
                return NextResponse.redirect(`${appUrl}/settings/automations?gmail=error&reason=db_insert_failed`)
            }
        }

        return NextResponse.redirect(`${appUrl}/settings/automations?gmail=connected`)

    } catch (error: unknown) {
        console.error('[Gmail Callback] Error:', error instanceof Error ? error.message : error)
        return NextResponse.redirect(`${appUrl}/settings/automations?gmail=error&reason=callback_failed`)
    }
}
