
import { createClient } from '@supabase/supabase-js';
import { logActivity } from '@/lib/services/activity-logger';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { apiError, zodIssuesToDetails } from '@/lib/api-response';

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
        // Validate secret token (constant-time comparison)
        const secret = request.headers.get('x-singlekey-secret');
        const expected = process.env.SINGLEKEY_WEBHOOK_SECRET;
        if (!secret || !expected ||
            secret.length !== expected.length ||
            !crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(expected))) {
            console.error('[SingleKey] Unauthorized webhook attempt');
            return apiError('Unauthorized', { status: 401 });
        }

        const body = await request.json();

        const validation = singleKeySchema.safeParse(body);
        if (!validation.success) {
            return apiError('Invalid payload', {
                status: 400,
                code: 'VALIDATION_ERROR',
                details: zodIssuesToDetails(validation.error.issues),
            });
        }

        const { application_id, report_url, score, status } = validation.data;

        console.log('[SingleKey] Webhook received for application:', application_id);

        // Idempotency: skip if this application already has a completed screening report
        const { data: existing } = await supabaseAdmin
            .from('applications')
            .select('background_status, singlekey_report_url')
            .eq('id', application_id)
            .maybeSingle();

        if (existing?.singlekey_report_url && existing?.background_status === 'completed') {
            console.log('[SingleKey] Duplicate webhook — already processed for', application_id);
            return NextResponse.json({ success: true, cached: true });
        }

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
            .maybeSingle();

        if (updateError || !application) {
            console.error('[SingleKey] Database update failed:', updateError);
            return apiError('Database update failed', { status: updateError ? 500 : 404 });
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
        return apiError('Internal Server Error', { status: 500 });
    }
}
