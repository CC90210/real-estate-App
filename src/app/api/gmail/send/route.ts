import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

interface Attachment {
    filename: string
    mimeType: string
    // base64-encoded file content
    data: string
}

interface SendEmailRequest {
    to: string | string[]
    subject: string
    body: string
    html?: string
    attachments?: Attachment[]
    // Optional: override which connected Gmail account to use (defaults to primary)
    tokenId?: string
}

interface GmailTokenRow {
    id: string
    company_id: string
    access_token: string
    refresh_token: string | null
    token_expiry: string | null
    email: string
}

/**
 * Builds a RFC 2822-compliant MIME message and encodes it as base64url.
 * Supports both plain-text-only and multipart/alternative (text + html) bodies,
 * with optional file attachments (multipart/mixed wrapper).
 */
function buildMimeMessage(params: {
    from: string
    to: string | string[]
    subject: string
    body: string
    html?: string
    attachments?: Attachment[]
}): string {
    const { from, to, subject, body, html, attachments } = params

    const toHeader = Array.isArray(to) ? to.join(', ') : to
    const boundary = `propflow_${Date.now()}_boundary`
    const altBoundary = `propflow_${Date.now()}_alt`

    const hasAttachments = attachments && attachments.length > 0
    const hasHtml = Boolean(html)

    const lines: string[] = []

    lines.push(`From: ${from}`)
    lines.push(`To: ${toHeader}`)
    lines.push(`Subject: ${subject}`)
    lines.push('MIME-Version: 1.0')

    if (hasAttachments) {
        lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
        lines.push('')
        lines.push(`--${boundary}`)
    }

    if (hasHtml) {
        if (hasAttachments) {
            lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`)
            lines.push('')
            lines.push(`--${altBoundary}`)
        } else {
            lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`)
            lines.push('')
            lines.push(`--${altBoundary}`)
        }

        // Plain text part
        lines.push('Content-Type: text/plain; charset="UTF-8"')
        lines.push('Content-Transfer-Encoding: quoted-printable')
        lines.push('')
        lines.push(body)
        lines.push('')
        lines.push(`--${altBoundary}`)

        // HTML part
        lines.push('Content-Type: text/html; charset="UTF-8"')
        lines.push('Content-Transfer-Encoding: quoted-printable')
        lines.push('')
        lines.push(html!)
        lines.push('')
        lines.push(`--${altBoundary}--`)
    } else {
        if (hasAttachments) {
            lines.push('Content-Type: text/plain; charset="UTF-8"')
            lines.push('Content-Transfer-Encoding: quoted-printable')
            lines.push('')
            lines.push(body)
        } else {
            lines.push('Content-Type: text/plain; charset="UTF-8"')
            lines.push('Content-Transfer-Encoding: quoted-printable')
            lines.push('')
            lines.push(body)
        }
    }

    if (hasAttachments) {
        for (const attachment of attachments!) {
            lines.push('')
            lines.push(`--${boundary}`)
            lines.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`)
            lines.push('Content-Transfer-Encoding: base64')
            lines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`)
            lines.push('')
            lines.push(attachment.data)
        }
        lines.push('')
        lines.push(`--${boundary}--`)
    }

    const raw = lines.join('\r\n')
    // Gmail API requires base64url encoding (not standard base64)
    return Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Refreshes an expired access token using the stored refresh_token and persists
 * the new token back to the database. Returns the fresh access token string.
 */
async function refreshAccessToken(
    supabase: Awaited<ReturnType<typeof createClient>>,
    tokenRow: GmailTokenRow
): Promise<string> {
    if (!tokenRow.refresh_token) {
        throw new Error('No refresh token stored. Please reconnect your Gmail account.')
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    if (!clientId || !clientSecret || !appUrl) {
        throw new Error('Gmail integration is not configured on this server.')
    }

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        `${appUrl}/api/gmail/callback`
    )

    oauth2Client.setCredentials({ refresh_token: tokenRow.refresh_token })

    const { credentials } = await oauth2Client.refreshAccessToken()

    if (!credentials.access_token) {
        throw new Error('Google did not return a new access token. Please reconnect your Gmail account.')
    }

    // Persist the refreshed token to avoid unnecessary refreshes on subsequent calls
    await supabase
        .from('gmail_oauth_tokens')
        .update({
            access_token: credentials.access_token,
            token_expiry: credentials.expiry_date
                ? new Date(credentials.expiry_date).toISOString()
                : null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', tokenRow.id)

    return credentials.access_token
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single()

        if (!profile?.company_id) {
            return NextResponse.json({ error: 'Company profile not found' }, { status: 403 })
        }

        const body: SendEmailRequest = await req.json()
        const { to, subject, body: textBody, html, attachments, tokenId } = body

        if (!to || !subject || !textBody) {
            return NextResponse.json(
                { error: 'Missing required fields: to, subject, body' },
                { status: 400 }
            )
        }

        // Fetch the Gmail token — use the specified tokenId or fall back to primary
        let tokenQuery = supabase
            .from('gmail_oauth_tokens')
            .select('id, company_id, access_token, refresh_token, token_expiry, email')
            .eq('company_id', profile.company_id)

        if (tokenId) {
            tokenQuery = tokenQuery.eq('id', tokenId)
        } else {
            tokenQuery = tokenQuery.eq('is_primary', true)
        }

        const { data: tokenRow, error: tokenError } = await tokenQuery.maybeSingle() as {
            data: GmailTokenRow | null
            error: unknown
        }

        if (tokenError || !tokenRow) {
            return NextResponse.json(
                { error: 'No Gmail account connected. Please connect a Gmail account in Settings > Automations.' },
                { status: 404 }
            )
        }

        // Check whether the stored access token is expired (with a 60-second safety buffer)
        let accessToken = tokenRow.access_token
        if (tokenRow.token_expiry) {
            const expiryMs = new Date(tokenRow.token_expiry).getTime()
            const nowMs = Date.now()
            const bufferMs = 60 * 1000

            if (nowMs >= expiryMs - bufferMs) {
                accessToken = await refreshAccessToken(supabase, tokenRow)
            }
        }

        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET
        const appUrl = process.env.NEXT_PUBLIC_APP_URL

        if (!clientId || !clientSecret || !appUrl) {
            return NextResponse.json(
                { error: 'Gmail integration is not configured on this server.' },
                { status: 503 }
            )
        }

        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            `${appUrl}/api/gmail/callback`
        )
        oauth2Client.setCredentials({ access_token: accessToken })

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

        const rawMessage = buildMimeMessage({
            from: tokenRow.email,
            to,
            subject,
            body: textBody,
            html,
            attachments,
        })

        const { data: sentMessage } = await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: rawMessage },
        })

        return NextResponse.json({
            success: true,
            messageId: sentMessage.id,
            threadId: sentMessage.threadId,
            from: tokenRow.email,
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred'
        return NextResponse.json(
            { error: `Failed to send email: ${message}` },
            { status: 500 }
        )
    }
}
