/**
 * Server-only email sender that calls /api/email/send (Gmail SMTP via nodemailer).
 *
 * This file does NOT import nodemailer — it calls the API route which does.
 * Safe for Turbopack bundling.
 */

const APP_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

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
 * Send email via PropFlow's Gmail SMTP (propflowpartners@gmail.com).
 * Calls /api/email/send internally — that route handles nodemailer.
 *
 * Uses VERCEL_URL for correct internal routing on Vercel (avoids DNS loops).
 * Falls back to Resend if Gmail fails.
 */
export async function sendPlatformEmail(params: PlatformEmailParams): Promise<PlatformEmailResult> {
    const { to, subject, html, text, cc, replyTo } = params

    const internalSecret = process.env.AUTOMATION_INTERNAL_SECRET || process.env.WEBHOOK_SECRET
    if (!internalSecret) {
        return { success: false, error: 'No WEBHOOK_SECRET configured for internal email calls' }
    }

    const gmailConfigured = !!process.env.PROPFLOW_GMAIL_APP_PASSWORD

    // 1. Try Gmail SMTP via /api/email/send
    if (gmailConfigured) {
        try {
            const response = await fetch(`${APP_URL}/api/email/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-PropFlow-Internal-Secret': internalSecret,
                },
                body: JSON.stringify({
                    to: Array.isArray(to) ? to.join(', ') : to,
                    subject,
                    html,
                    text,
                    cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
                    replyTo,
                }),
            })

            if (response.ok) {
                const data = await response.json()
                console.log('[EMAIL] Sent via Gmail SMTP:', subject, 'to:', to, 'id:', data.messageId)
                return { success: true, id: data.messageId }
            }

            const errBody = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
            console.warn('[EMAIL] Gmail SMTP failed:', errBody.error)
            // Fall through to Resend
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            console.warn('[EMAIL] Gmail SMTP call failed:', msg)
            // Fall through to Resend
        }
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
                return { success: false, error: error.message }
            }
            console.log('[EMAIL] Sent via Resend fallback:', subject, 'to:', to)
            return { success: true, id: data?.id }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            return { success: false, error: msg }
        }
    }

    return {
        success: false,
        error: gmailConfigured
            ? 'Gmail SMTP call failed and no Resend fallback configured'
            : 'No email provider configured. Set PROPFLOW_GMAIL_APP_PASSWORD.',
    }
}
