/**
 * POST /api/email/send — PropFlow Platform Email Sender
 *
 * Sends email via Gmail SMTP using the platform's pre-configured App Password.
 * No OAuth, no user setup — fully baked in. Clients never see this.
 *
 * Auth: Internal only (X-PropFlow-Internal-Secret header).
 *
 * Env vars required:
 *   PROPFLOW_MASTER_EMAIL      — propflowpartners@gmail.com
 *   PROPFLOW_GMAIL_APP_PASSWORD — Google App Password (16 chars, no spaces)
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import nodemailer from 'nodemailer'
import { apiError } from '@/lib/api-response'

const MASTER_EMAIL = process.env.PROPFLOW_MASTER_EMAIL || 'propflowpartners@gmail.com'
const APP_PASSWORD = process.env.PROPFLOW_GMAIL_APP_PASSWORD || ''

function verifyInternalSecret(received: string | null): boolean {
    const expected = process.env.AUTOMATION_INTERNAL_SECRET || process.env.WEBHOOK_SECRET
    if (!received || !expected) return false
    const a = Buffer.from(received)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
    try {
        // Auth: internal service calls only
        const secret = req.headers.get('x-propflow-internal-secret')
        if (!verifyInternalSecret(secret)) {
            return apiError('Unauthorized', { status: 401 })
        }

        if (!APP_PASSWORD) {
            return apiError('PROPFLOW_GMAIL_APP_PASSWORD not configured', { status: 503 })
        }

        const body = await req.json()
        const { to, subject, html, text, cc, replyTo } = body

        if (!to || !subject) {
            return apiError('Missing required fields: to, subject', { status: 400 })
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: MASTER_EMAIL,
                pass: APP_PASSWORD,
            },
        })

        const info = await transporter.sendMail({
            from: `PropFlow <${MASTER_EMAIL}>`,
            to,
            cc: cc || undefined,
            replyTo: replyTo || undefined,
            subject,
            text: text || undefined,
            html: html || undefined,
        })

        return NextResponse.json({
            success: true,
            messageId: info.messageId,
            from: MASTER_EMAIL,
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Email send failed'
        console.error('[Platform Email] Error:', message)
        return apiError('Failed to send email', { status: 500 })
    }
}
