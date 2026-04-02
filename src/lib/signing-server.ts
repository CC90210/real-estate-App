import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { loadCompanyBranding } from '@/lib/email'
import { sendPlatformEmail } from '@/lib/email-server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as JsonObject
        : {}
}

export interface CreateSigningRequestParams {
    companyId: string
    senderId: string
    senderName?: string | null
    senderEmail?: string | null
    documentId?: string | null
    title?: string | null
    recipientEmail: string
    recipientName?: string | null
    message?: string | null
    documentUrl?: string | null
    ccEmail?: string | null
}

export interface CreateSigningRequestResult {
    signingRequest: {
        id: string
        status: string
        recipient_email: string
        recipient_name: string | null
        signing_token: string
    } & Record<string, unknown>
    warning?: string
    emailError?: string
}

export async function createSigningRequestAndSendEmail(
    params: CreateSigningRequestParams
): Promise<CreateSigningRequestResult> {
    const adminDb = getSupabaseAdmin()
    const recipientEmail = params.recipientEmail.trim()
    const recipientName = params.recipientName?.trim() || null

    let linkedDocument: {
        id: string
        title: string | null
        type: string
        content: unknown
    } | null = null

    if (params.documentId) {
        const { data: document, error: documentError } = await adminDb
            .from('documents')
            .select('id, title, type, content')
            .eq('id', params.documentId)
            .eq('company_id', params.companyId)
            .maybeSingle()

        if (documentError) {
            throw documentError
        }

        if (!document) {
            throw new Error('Document not found')
        }

        linkedDocument = document
    }

    const title = params.title?.trim() || linkedDocument?.title?.trim() || 'Rental Document'
    const documentUrl = params.documentUrl || (params.documentId ? `${APP_URL}/documents/${params.documentId}` : null)
    const signingToken = crypto.randomUUID()
    const requestedAt = new Date().toISOString()

    const { data: signingRequest, error: insertError } = await adminDb
        .from('signing_requests')
        .insert({
            company_id: params.companyId,
            document_id: params.documentId ?? null,
            title,
            recipient_email: recipientEmail,
            recipient_name: recipientName,
            message: params.message ?? null,
            document_url: documentUrl,
            signing_token: signingToken,
            status: 'pending',
            sender_id: params.senderId,
        })
        .select()
        .single()

    if (insertError) {
        throw insertError
    }

    adminDb.from('signing_audit_log').insert({
        signing_request_id: signingRequest.id,
        action: 'created',
        actor_email: params.senderEmail ?? undefined,
        metadata: { sender_id: params.senderId },
    }).then(({ error }) => {
        if (error) {
            console.warn('[Signing] Audit log (created) failed:', error.message)
        }
    })

    if (linkedDocument) {
        const nextContent: JsonObject = {
            ...asObject(linkedDocument.content),
            recipient_name: recipientName,
            recipient_email: recipientEmail,
            eSignEnabled: true,
            eSignProvider: 'propflow',
            signing_request_id: signingRequest.id,
            signing_requested_at: requestedAt,
        }

        adminDb
            .from('documents')
            .update({
                content: nextContent,
                delivery_status: 'pending',
            })
            .eq('id', linkedDocument.id)
            .eq('company_id', params.companyId)
            .then(({ error }) => {
                if (error) {
                    console.warn('[Signing] Failed to link document to signing request:', error.message)
                }
            })
    }

    const branding = await loadCompanyBranding(params.companyId)
    const senderName = params.senderName || params.senderEmail || 'Your agent'
    const companyName = branding.name || 'PropFlow'
    const accent = branding.primary_color || '#3b82f6'
    const signingUrl = `${APP_URL}/sign/${signingToken}`
    const senderEmail = params.ccEmail || params.senderEmail || undefined

    const html = buildSigningEmailHtml({
        recipientName: recipientName || recipientEmail,
        senderName,
        documentTitle: title,
        signingUrl,
        message: params.message ?? null,
        branding,
        accent,
    })

    const emailResult = await sendPlatformEmail({
        to: recipientEmail,
        subject: `${senderName} (${companyName}) requests your signature - ${title}`,
        html,
        cc: senderEmail,
        replyTo: senderEmail,
    })

    if (emailResult.success) {
        await adminDb
            .from('signing_requests')
            .update({ status: 'sent' })
            .eq('id', signingRequest.id)

        if (linkedDocument) {
            await adminDb
                .from('documents')
                .update({
                    delivery_status: 'sent',
                    delivered_to: recipientEmail,
                    delivered_at: new Date().toISOString(),
                })
                .eq('id', linkedDocument.id)
                .eq('company_id', params.companyId)
        }

        adminDb.from('signing_audit_log').insert({
            signing_request_id: signingRequest.id,
            action: 'sent',
            actor_email: senderEmail,
            metadata: { email_id: emailResult.id ?? null, recipient_email: recipientEmail },
        }).then(({ error }) => {
            if (error) {
                console.warn('[Signing] Audit log (sent) failed:', error.message)
            }
        })

        return {
            signingRequest: {
                ...signingRequest,
                status: 'sent',
            },
        }
    }

    adminDb.from('signing_audit_log').insert({
        signing_request_id: signingRequest.id,
        action: 'email_failed',
        actor_email: senderEmail,
        metadata: { error: emailResult.error, recipient_email: recipientEmail },
    }).then(({ error }) => {
        if (error) {
            console.warn('[Signing] Audit log (email_failed) failed:', error.message)
        }
    })

    return {
        signingRequest,
        warning: 'Signing request created but email delivery failed. The recipient may need to be notified manually.',
        emailError: emailResult.error,
    }
}

function buildSigningEmailHtml({
    recipientName,
    senderName,
    documentTitle,
    signingUrl,
    message,
    branding,
    accent,
}: {
    recipientName: string
    senderName: string
    documentTitle: string
    signingUrl: string
    message: string | null
    branding: {
        name: string
        logo_url?: string | null
        email_footer_text?: string | null
        email?: string | null
        phone?: string | null
    }
    accent: string
}) {
    const name = branding.name || 'PropFlow'
    const logoHtml = branding.logo_url
        ? `<img src="${branding.logo_url}" alt="${name}" style="max-height:48px;max-width:200px;margin:0 auto 8px;display:block;" />`
        : ''
    const footerExtra = branding.email_footer_text
        ? `<p style="margin-top:8px;">${branding.email_footer_text}</p>`
        : ''
    const contactLine = [branding.email, branding.phone].filter(Boolean).join(' | ')

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8fafc; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background: white; border-radius: 16px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .logo { text-align: center; margin-bottom: 32px; }
        .logo h1 { font-size: 24px; font-weight: 900; color: #1e293b; margin: 0; letter-spacing: -0.5px; }
        .logo p { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: ${accent}; margin: 4px 0 0; }
        h2 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px; }
        p { font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 16px; }
        .btn { display: inline-block; padding: 14px 32px; background: ${accent}; color: white !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; }
        .highlight-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">
                ${logoHtml}
                <h1>${name}</h1>
                <p>Powered by PropFlow</p>
            </div>
            <h2>Signature Requested</h2>
            <p>Hi ${recipientName},</p>
            <p><strong>${senderName}</strong> from <strong>${name}</strong> has sent you a document that requires your signature.</p>
            <div class="highlight-box">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Document</td><td style="padding: 8px 0; text-align: right; font-weight: 700;">${documentTitle}</td></tr>
                    <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">From</td><td style="padding: 8px 0; text-align: right; font-weight: 700;">${senderName}</td></tr>
                </table>
            </div>
            ${message ? `<p style="font-style: italic; color: #64748b; border-left: 3px solid #e2e8f0; padding-left: 16px;">"${message}"</p>` : ''}
            <div style="text-align: center; margin: 32px 0;">
                <a href="${signingUrl}" class="btn">Review &amp; Sign Document</a>
            </div>
            <p style="font-size: 13px; color: #94a3b8;">If you were not expecting this request, you can safely ignore this email. The link is unique to you - do not forward it.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${name}. All rights reserved.</p>
            ${contactLine ? `<p style="margin-top:4px;">${contactLine}</p>` : ''}
            ${footerExtra}
            <p style="margin-top:8px;font-size:10px;color:#cbd5e1;">
                Sent via <a href="${APP_URL}" style="color:${accent};text-decoration:none;">PropFlow</a> e-sign
            </p>
        </div>
    </div>
</body>
</html>`
}
