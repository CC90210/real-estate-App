import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================
// NOTIFICATION CREATOR (Server-side)
// ============================================

interface CreateNotificationInput {
    userId: string
    companyId?: string
    title: string
    message: string
    type?: 'info' | 'success' | 'warning' | 'error' | 'action'
    category?: 'general' | 'application' | 'maintenance' | 'lease' | 'invoice' | 'showing' | 'team' | 'system' | 'payment'
    actionUrl?: string
    actionLabel?: string
    metadata?: Record<string, any>
    sendEmailNotification?: boolean
    emailSubject?: string
    emailHtml?: string
}

export async function createNotification(input: CreateNotificationInput) {
    try {
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: input.userId,
                company_id: input.companyId,
                title: input.title,
                message: input.message,
                type: input.type || 'info',
                category: input.category || 'general',
                action_url: input.actionUrl,
                action_label: input.actionLabel,
                metadata: input.metadata || {},
            })
            .select()
            .single()

        if (error) {
            console.error('[NOTIFICATION] Insert error:', error)
            return { success: false, error: error.message }
        }

        // Optionally send email
        if (input.sendEmailNotification && input.emailHtml) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('email')
                .eq('id', input.userId)
                .single()

            if (profile?.email) {
                const emailResult = await sendEmail({
                    to: profile.email,
                    subject: input.emailSubject || input.title,
                    html: input.emailHtml,
                })

                if (emailResult.success) {
                    await supabaseAdmin
                        .from('notifications')
                        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
                        .eq('id', data.id)
                }
            }
        }

        return { success: true, notification: data }
    } catch (err: any) {
        console.error('[NOTIFICATION] Exception:', err)
        return { success: false, error: err.message }
    }
}

// Batch create notifications for all company members
export async function notifyCompanyMembers({
    companyId,
    title,
    message,
    type = 'info',
    category = 'general',
    actionUrl,
    actionLabel,
    metadata,
    excludeUserId,
}: {
    companyId: string
    title: string
    message: string
    type?: 'info' | 'success' | 'warning' | 'error' | 'action'
    category?: string
    actionUrl?: string
    actionLabel?: string
    metadata?: Record<string, any>
    excludeUserId?: string
}) {
    const { data: members } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('company_id', companyId)

    if (!members?.length) return

    const notifications = members
        .filter(m => m.id !== excludeUserId)
        .map(m => ({
            user_id: m.id,
            company_id: companyId,
            title,
            message,
            type,
            category,
            action_url: actionUrl,
            action_label: actionLabel,
            metadata: metadata || {},
        }))

    if (notifications.length > 0) {
        await supabaseAdmin.from('notifications').insert(notifications)
    }
}
