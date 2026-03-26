
import { createClient } from '@supabase/supabase-js';
import { logActivity } from '@/lib/services/activity-logger';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Admin client for webhook (bypasses RLS — webhooks have no user session)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const singleKeySchema = z.object({
    application_id: z.string().uuid(),
    report_url: z.string().url(),
    score: z.number().int().min(300).max(900).optional(),
    status: z.string().max(50).optional()
});

export async function POST(request: Request) {
    try {
        // Validate secret token
        const secret = request.headers.get('x-singlekey-secret');
        if (!secret || secret !== process.env.SINGLEKEY_WEBHOOK_SECRET) {
            console.error('[SingleKey] Unauthorized webhook attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        const validation = singleKeySchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const { application_id, report_url, score, status } = validation.data;

        console.log('[SingleKey] Webhook received');

        // Use admin client — webhooks come from SingleKey servers (no user cookies)
        const { data: application, error: updateError } = await supabaseAdmin
            .from('applications')
            .update({
                singlekey_report_url: report_url,
                credit_score: score,
                background_status: status || 'completed',
                status: 'screening'
            })
            .eq('id', application_id)
            .select('*, property:properties(owner_id, address)')
            .single();

        if (updateError) {
            console.error('[SingleKey] Database update failed:', updateError);
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

        // Notify the landlord
        const landlordId = application.property?.owner_id;
        if (landlordId) {
            await logActivity(supabaseAdmin, {
                companyId: application.company_id,
                userId: landlordId,
                action: 'SCREEN_READY',
                entityType: 'application',
                entityId: application_id,
                description: `New screening report ready for ${application.applicant_name} at ${application.property?.address}`,
                details: { score }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('[SingleKey] Webhook failure:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
