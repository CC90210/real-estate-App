import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { google } from 'googleapis'
import { apiError } from '@/lib/api-response'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

interface Attachment {
    filename: string
    mimeType: string
    data: string
}

interface SendEmailRequest {
    companyId?: string
    to: string | string[]
    subject: string
    body: string
    html?: string
    attachments?: Attachment[]
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
        lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`)
        lines.push('')
        lines.push(`--${altBoundary}`)
        lines.push('Content-Type: text/plain; charset="UTF-8"')
        lines.push('Content-Transfer-Encoding: quoted-printable')
        lines.push('')
        lines.push(body)
        lines.push('')
        lines.push(`--${altBoundary}`)
        lines.push('Content-Type: text/html; charset="UTF-8"')
        lines.push('Content-Transfer-Encoding: quoted-printable')
        lines.push('')
        lines.push(html || '')
        lines.push('')
        lines.push(`--${altBoundary}--`)
    } else {
        lines.push('Content-Type: text/plain; charset="UTF-8"')
        lines.push('Content-Transfer-Encoding: quoted-printable')
        lines.push('')
        lines.push(body)
    }

    if (hasAttachments) {
        for (const attachment of attachments || []) {
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

    return Buffer.from(lines.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

async function refreshAccessToken(supabaseClient: any, tokenRow: GmailTokenRow): Promise<string> {
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

    await supabaseClient
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

function matchesInternalSecret(received: string | null, expected: string | undefined) {
    if (!received || !expected) {
        return false
    }

    const receivedBuffer = Buffer.from(received)
    const expectedBuffer = Buffer.from(expected)

    if (receivedBuffer.length !== expectedBuffer.length) {
        return false
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer)
}

export async function POST(req: NextRequest) {
    try {
        const body: SendEmailRequest = await req.json()
        const internalSecret = req.headers.get('x-propflow-internal-secret')
        const expectedInternalSecret = process.env.AUTOMATION_INTERNAL_SECRET || process.env.WEBHOOK_SECRET
        const isInternal = matchesInternalSecret(internalSecret, expectedInternalSecret)

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user && !isInternal) {
            return apiError('Unauthorized', { status: 401 })
        }

        const { to, subject, body: textBody, html, attachments, tokenId, companyId } = body

        if (!to || !subject || !textBody) {
            return apiError('Missing required fields: to, subject, body', {
                status: 400,
                code: 'MISSING_FIELDS',
            })
        }

        const tokenClient = isInternal ? getSupabaseAdmin() : supabase
        let resolvedCompanyId: string | null = null

        if (isInternal) {
            resolvedCompanyId = companyId?.trim() || null
            if (!resolvedCompanyId) {
                return apiError('companyId is required for internal Gmail sends', {
                    status: 400,
                    code: 'MISSING_COMPANY_ID',
                })
            }
        } else {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user!.id)
                .maybeSingle()

            resolvedCompanyId = profile?.company_id || null
            if (!resolvedCompanyId) {
                return apiError('Company profile not found', { status: 403 })
            }
        }

        let tokenQuery = tokenClient
            .from('gmail_oauth_tokens')
            .select('id, company_id, access_token, refresh_token, token_expiry, email')
            .eq('company_id', resolvedCompanyId)

        tokenQuery = tokenId ? tokenQuery.eq('id', tokenId) : tokenQuery.eq('is_primary', true)

        const { data: tokenRow, error: tokenError } = await tokenQuery.maybeSingle() as {
            data: GmailTokenRow | null
            error: unknown
        }

        if (tokenError || !tokenRow) {
            return apiError(
                'No Gmail account connected. Please connect a Gmail account in Settings > Automations.',
                { status: 404 }
            )
        }

        let accessToken = tokenRow.access_token
        if (tokenRow.token_expiry) {
            const expiryMs = new Date(tokenRow.token_expiry).getTime()
            if (Date.now() >= expiryMs - 60 * 1000) {
                accessToken = await refreshAccessToken(tokenClient, tokenRow)
            }
        }

        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET
        const appUrl = process.env.NEXT_PUBLIC_APP_URL

        if (!clientId || !clientSecret || !appUrl) {
            return apiError('Gmail integration is not configured on this server.', {
                status: 503,
                code: 'GMAIL_NOT_CONFIGURED',
            })
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
        console.error('[Gmail Send] Error:', error instanceof Error ? error.message : error)
        return apiError('Failed to send email', { status: 500 })
    }
}
