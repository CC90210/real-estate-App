import { SupabaseClient } from '@supabase/supabase-js';

export interface ActivityLogParams {
    companyId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    description: string;
    details?: Record<string, any>;
}

export async function logActivity(supabase: SupabaseClient, params: ActivityLogParams) {
    const { error } = await supabase.from('activity_log').insert({
        company_id: params.companyId,
        user_id: params.userId,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        description: params.description,
        details: params.details || null,
    });
    if (error) console.error('[ActivityLogger] Insert failed:', error.message);
    return { error };
}
