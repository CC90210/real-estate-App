import { createClient } from '@/lib/supabase/server'

export type ActivityType =
    | 'property.created'
    | 'property.updated'
    | 'property.deleted'
    | 'application.received'
    | 'application.approved'
    | 'application.rejected'
    | 'document.created'
    | 'document.sent'
    | 'invoice.created'
    | 'invoice.paid'
    | 'maintenance.created'
    | 'maintenance.completed'
    | 'team.member_joined'
    | 'team.member_removed'
    | 'settings.updated'

interface LogActivityParams {
    companyId: string
    userId: string
    type: ActivityType
    title: string
    description?: string
    metadata?: Record<string, any>
    entityType?: string
    entityId?: string
}

export async function logActivity({
    companyId,
    userId,
    type,
    title,
    description,
    metadata,
    entityType,
    entityId,
}: LogActivityParams) {
    const supabase = await createClient()
    try {
        await supabase.from('activity_log').insert({
            company_id: companyId,
            user_id: userId,
            type,
            title,
            description,
            metadata,
            entity_type: entityType,
            entity_id: entityId,
        })
    } catch (error) {
        console.error('Failed to log activity:', error)
    }
}

export async function logActivityWithNotification(
    params: LogActivityParams,
    notifyUsers?: string[] // simplified for this implementation
) {
    const supabase = await createClient()
    await logActivity(params)

    // Create notification
    await supabase.from('notifications').insert({
        company_id: params.companyId,
        user_id: notifyUsers ? notifyUsers[0] : null, // Simplification: notify one or all
        type: params.type.split('.')[0] as any,
        title: params.title,
        message: params.description || '',
        link: params.entityType && params.entityId
            ? `/${params.entityType}/${params.entityId}`
            : undefined,
    })
}
