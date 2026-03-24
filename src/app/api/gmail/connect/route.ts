import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { google } from 'googleapis'
import crypto from 'crypto'

export async function POST(_req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET
        const appUrl = process.env.NEXT_PUBLIC_APP_URL

        if (!clientId || !clientSecret) {
            return NextResponse.json(
                { error: 'Gmail integration is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables.' },
                { status: 503 }
            )
        }

        if (!appUrl) {
            return NextResponse.json(
                { error: 'NEXT_PUBLIC_APP_URL environment variable is not set.' },
                { status: 503 }
            )
        }

        const redirectUri = `${appUrl}/api/gmail/callback`

        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

        // Generate a cryptographically secure state token for CSRF protection
        const state = crypto.randomBytes(32).toString('hex')

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent', // Force consent screen to always get a refresh_token
            scope: [
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/userinfo.email',
            ],
            state,
        })

        // Store state in a short-lived cookie for CSRF validation in the callback
        const cookieStore = await cookies()
        cookieStore.set('gmail_oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 10, // 10 minutes
            path: '/',
        })

        return NextResponse.json({ authUrl })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred'
        return NextResponse.json(
            { error: `Failed to initiate Gmail connection: ${message}` },
            { status: 500 }
        )
    }
}
