/**
 * Server-only email sender — Gmail SMTP via nodemailer.
 *
 * IMPORTANT: Only import this file from API routes (src/app/api/**).
 * Do NOT import from shared lib files — Turbopack will try to bundle
 * nodemailer for the client and fail.
 *
 * Required env vars:
 *   PROPFLOW_MASTER_EMAIL       — propflowpartners@gmail.com
 *   PROPFLOW_GMAIL_APP_PASSWORD — Google App Password (16 chars)
 */

import nodemailer from 'nodemailer'

const MASTER_EMAIL = process.env.PROPFLOW_MASTER_EMAIL || 'propflowpartners@gmail.com'
const APP_PASSWORD = process.env.PROPFLOW_GMAIL_APP_PASSWORD || ''

export interface PlatformEmailParams {
    to: string | string[]
    subject: string
    html: string
    text?: string
    cc?: string | string[]
    replyTo?: string
}

export interface PlatformEmailResult {
    success: boolean
    id?: string
    error?: string
}

/**
 * Send email via PropFlow's Gmail SMTP. Direct nodemailer — no HTTP calls.
 * Falls back to Resend if Gmail SMTP is not configured or fails.
 */
export async function sendPlatformEmail(params: PlatformEmailParams): Promise<PlatformEmailResult> {
    const { to, subject, html, text, cc, replyTo } = params

    // 1. Try Gmail SMTP directly
    if (APP_PASSWORD) {
        try {
            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: MASTER_EMAIL,
                    pass: APP_PASSWORD,
                },
            })

            const toList = Array.isArray(to) ? to.join(', ') : to
            const ccList = cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined

            const info = await transporter.sendMail({
                from: `PropFlow <${MASTER_EMAIL}>`,
                to: toList,
                cc: ccList || undefined,
                replyTo: replyTo || undefined,
                subject,
                text: text || undefined,
                html: html || undefined,
            })

            console.log('[EMAIL] Sent via Gmail SMTP:', subject, 'to:', toList, 'id:', info.messageId)
            return { success: true, id: info.messageId }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err)
            console.error('[EMAIL] Gmail SMTP failed:', message)
            // Fall through to Resend
        }
    } else {
        console.warn('[EMAIL] PROPFLOW_GMAIL_APP_PASSWORD not set — skipping Gmail')
    }

    // 2. Fallback: Resend
    if (process.env.RESEND_API_KEY) {
        try {
            const { Resend } = await import('resend')
            const resend = new Resend(process.env.RESEND_API_KEY)

            const fromEmail = process.env.FROM_EMAIL || 'PropFlow <noreply@propflow.app>'
            const resendParams: Parameters<typeof resend.emails.send>[0] = {
                from: fromEmail,
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
                text,
            }
            if (cc) resendParams.cc = Array.isArray(cc) ? cc : [cc]
            if (replyTo) resendParams.replyTo = replyTo

            const { data, error } = await resend.emails.send(resendParams)
            if (error) {
                console.error('[EMAIL] Resend error:', error)
                return { success: false, error: error.message }
            }
            console.log('[EMAIL] Sent via Resend fallback:', subject, 'to:', to)
            return { success: true, id: data?.id }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            console.error('[EMAIL] Resend failed:', msg)
            return { success: false, error: msg }
        }
    }

    return {
        success: false,
        error: APP_PASSWORD
            ? 'Gmail SMTP failed and no RESEND_API_KEY fallback configured'
            : 'No email provider configured. Set PROPFLOW_GMAIL_APP_PASSWORD in Vercel env vars.',
    }
}
