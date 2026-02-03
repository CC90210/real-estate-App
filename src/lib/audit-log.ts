import { createClient } from '@/lib/supabase/server'

type AuditAction =
    | 'login'
    | 'logout'
    | 'password_change'
    | 'data_export'
    | 'settings_change'
    | 'user_invite'
    | 'user_delete'
    | 'api_access'

interface AuditLogEntry {
    action: AuditAction
    userId?: string
    companyId?: string
    resourceType?: string
    resourceId?: string
    metadata?: Record<string, any>
    ipAddress?: string
    userAgent?: string
}

export async function logAuditEvent(entry: AuditLogEntry) {
    const supabase = await createClient()

    try {
        await supabase.from('audit_logs').insert({
            action: entry.action,
            user_id: entry.userId,
            company_id: entry.companyId,
            resource_type: entry.resourceType,
            resource_id: entry.resourceId,
            metadata: entry.metadata,
            ip_address: entry.ipAddress,
            user_agent: entry.userAgent,
            created_at: new Date().toISOString()
        })
    } catch (error) {
        console.error('Audit log failed:', error)
        // Don't throw - audit logging should not break the app
    }
}
