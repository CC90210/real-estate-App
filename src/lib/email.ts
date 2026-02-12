import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.FROM_EMAIL || 'PropFlow <noreply@propflow.app>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ============================================
// CORE EMAIL SENDER
// ============================================
export async function sendEmail({
    to,
    subject,
    html,
    text,
}: {
    to: string | string[]
    subject: string
    html: string
    text?: string
}) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('[EMAIL] RESEND_API_KEY not set - email not sent:', subject, 'to:', to)
        return { success: false, error: 'Email service not configured' }
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            text,
        })

        if (error) {
            console.error('[EMAIL] Send error:', error)
            return { success: false, error: error.message }
        }

        console.log('[EMAIL] Sent:', subject, 'to:', to, 'id:', data?.id)
        return { success: true, id: data?.id }
    } catch (err: any) {
        console.error('[EMAIL] Exception:', err)
        return { success: false, error: err.message }
    }
}


// ============================================
// EMAIL TEMPLATES
// ============================================

function baseTemplate(content: string, companyName?: string) {
    return `
<!DOCTYPE html>
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
        .logo p { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #3b82f6; margin: 4px 0 0; }
        h2 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px; }
        p { font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 16px; }
        .btn { display: inline-block; padding: 14px 32px; background: #1e293b; color: white !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; }
        .btn:hover { background: #334155; }
        .btn-primary { background: #3b82f6; }
        .btn-primary:hover { background: #2563eb; }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #94a3b8; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
        .badge-blue { background: #eff6ff; color: #3b82f6; }
        .badge-green { background: #f0fdf4; color: #16a34a; }
        .badge-red { background: #fef2f2; color: #ef4444; }
        .badge-amber { background: #fffbeb; color: #d97706; }
        .divider { height: 1px; background: #e2e8f0; margin: 24px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .detail-label { color: #94a3b8; font-weight: 600; }
        .detail-value { color: #1e293b; font-weight: 700; }
        .highlight-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">
                <h1>${companyName || 'PropFlow'}</h1>
                <p>Property Intelligence</p>
            </div>
            ${content}
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${companyName || 'PropFlow'}. All rights reserved.</p>
            <p style="margin-top: 8px;">
                <a href="${APP_URL}" style="color: #3b82f6; text-decoration: none;">Visit Dashboard</a>
            </p>
        </div>
    </div>
</body>
</html>`
}


// ============================================
// SPECIFIC EMAIL FUNCTIONS
// ============================================

export async function sendTeamInviteEmail({
    email,
    inviterName,
    companyName,
    role,
    inviteUrl,
}: {
    email: string
    inviterName: string
    companyName: string
    role: string
    inviteUrl: string
}) {
    const html = baseTemplate(`
        <h2>You're Invited! 🎉</h2>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> as a <span class="badge badge-blue">${role}</span>.</p>
        <p>Click the button below to create your account and get started:</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteUrl}" class="btn btn-primary">Accept Invitation</a>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">This invitation expires in 7 days. If you didn't expect this, you can safely ignore it.</p>
    `, companyName)

    return sendEmail({
        to: email,
        subject: `${inviterName} invited you to join ${companyName}`,
        html,
    })
}

export async function sendApplicationStatusEmail({
    email,
    applicantName,
    propertyAddress,
    status,
    companyName,
    notes,
}: {
    email: string
    applicantName: string
    propertyAddress: string
    status: 'approved' | 'denied' | 'screening'
    companyName: string
    notes?: string
}) {
    const statusConfig = {
        approved: { badge: 'badge-green', label: 'Approved', emoji: '✅', message: 'Congratulations! Your application has been approved.' },
        denied: { badge: 'badge-red', label: 'Denied', emoji: '❌', message: 'We regret to inform you that your application was not approved at this time.' },
        screening: { badge: 'badge-amber', label: 'In Screening', emoji: '🔍', message: 'Your application is currently being reviewed.' },
    }

    const config = statusConfig[status]

    const html = baseTemplate(`
        <h2>Application Update ${config.emoji}</h2>
        <p>Hi ${applicantName},</p>
        <p>${config.message}</p>
        <div class="highlight-box">
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Property</td><td style="padding: 6px 0; text-align: right; font-weight: 700;">${propertyAddress}</td></tr>
                <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Status</td><td style="padding: 6px 0; text-align: right;"><span class="badge ${config.badge}">${config.label}</span></td></tr>
            </table>
        </div>
        ${notes ? `<p style="font-style: italic; color: #64748b;">"${notes}"</p>` : ''}
        <p>If you have questions, please contact your agent directly.</p>
    `, companyName)

    return sendEmail({
        to: email,
        subject: `Application ${config.label} — ${propertyAddress}`,
        html,
    })
}

export async function sendInvoiceEmail({
    email,
    recipientName,
    invoiceNumber,
    amount,
    dueDate,
    companyName,
    downloadUrl,
}: {
    email: string
    recipientName: string
    invoiceNumber: string
    amount: number
    dueDate: string
    companyName: string
    downloadUrl?: string
}) {
    const html = baseTemplate(`
        <h2>Invoice ${invoiceNumber}</h2>
        <p>Hi ${recipientName},</p>
        <p>A new invoice has been generated for you.</p>
        <div class="highlight-box">
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Invoice #</td><td style="padding: 8px 0; text-align: right; font-weight: 700;">${invoiceNumber}</td></tr>
                <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Amount</td><td style="padding: 8px 0; text-align: right; font-weight: 900; font-size: 20px; color: #0f172a;">$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
                <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Due Date</td><td style="padding: 8px 0; text-align: right; font-weight: 700;">${dueDate}</td></tr>
            </table>
        </div>
        ${downloadUrl ? `
        <div style="text-align: center; margin: 24px 0;">
            <a href="${downloadUrl}" class="btn">Download Invoice</a>
        </div>` : ''}
        <p style="font-size: 13px; color: #94a3b8;">Please contact us if you have any questions about this invoice.</p>
    `, companyName)

    return sendEmail({
        to: email,
        subject: `Invoice ${invoiceNumber} — $${amount.toFixed(2)} Due ${dueDate}`,
        html,
    })
}

export async function sendMaintenanceUpdateEmail({
    email,
    tenantName,
    requestTitle,
    status,
    notes,
    companyName,
    propertyAddress,
}: {
    email: string
    tenantName: string
    requestTitle: string
    status: string
    notes?: string
    companyName: string
    propertyAddress: string
}) {
    const statusLabels: Record<string, string> = {
        open: 'Received',
        in_progress: 'In Progress',
        scheduled: 'Scheduled',
        pending_parts: 'Waiting on Parts',
        completed: 'Completed',
        cancelled: 'Cancelled',
    }

    const html = baseTemplate(`
        <h2>Maintenance Update 🔧</h2>
        <p>Hi ${tenantName},</p>
        <p>There's an update on your maintenance request:</p>
        <div class="highlight-box">
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Request</td><td style="padding: 6px 0; text-align: right; font-weight: 700;">${requestTitle}</td></tr>
                <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Property</td><td style="padding: 6px 0; text-align: right; font-weight: 700;">${propertyAddress}</td></tr>
                <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Status</td><td style="padding: 6px 0; text-align: right;"><span class="badge badge-blue">${statusLabels[status] || status}</span></td></tr>
            </table>
        </div>
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
    `, companyName)

    return sendEmail({
        to: email,
        subject: `Maintenance Update: ${requestTitle} — ${statusLabels[status] || status}`,
        html,
    })
}

export async function sendShowingReminderEmail({
    email,
    agentName,
    propertyAddress,
    date,
    time,
    notes,
    companyName,
}: {
    email: string
    agentName: string
    propertyAddress: string
    date: string
    time: string
    notes?: string
    companyName: string
}) {
    const html = baseTemplate(`
        <h2>Showing Reminder 📅</h2>
        <p>Hi ${agentName},</p>
        <p>You have an upcoming property showing:</p>
        <div class="highlight-box">
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Property</td><td style="padding: 6px 0; text-align: right; font-weight: 700;">${propertyAddress}</td></tr>
                <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Date</td><td style="padding: 6px 0; text-align: right; font-weight: 700;">${date}</td></tr>
                <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Time</td><td style="padding: 6px 0; text-align: right; font-weight: 700;">${time}</td></tr>
            </table>
        </div>
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
        <div style="text-align: center; margin: 24px 0;">
            <a href="${APP_URL}/showings" class="btn btn-primary">View Showings</a>
        </div>
    `, companyName)

    return sendEmail({
        to: email,
        subject: `Showing Reminder: ${propertyAddress} on ${date}`,
        html,
    })
}

export async function sendLeaseExpiryEmail({
    email,
    tenantName,
    propertyAddress,
    endDate,
    daysRemaining,
    companyName,
}: {
    email: string
    tenantName: string
    propertyAddress: string
    endDate: string
    daysRemaining: number
    companyName: string
}) {
    const html = baseTemplate(`
        <h2>Lease Expiry Notice ⏰</h2>
        <p>Hi ${tenantName},</p>
        <p>Your lease at <strong>${propertyAddress}</strong> expires on <strong>${endDate}</strong> — that's <strong>${daysRemaining} days</strong> from now.</p>
        <p>Please contact your property manager to discuss renewal options.</p>
        <div style="text-align: center; margin: 24px 0;">
            <a href="${APP_URL}" class="btn btn-primary">Contact Us</a>
        </div>
    `, companyName)

    return sendEmail({
        to: email,
        subject: `Lease Expiry Notice — ${daysRemaining} days remaining`,
        html,
    })
}
