import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { webhookCallbackSchema } from '@/lib/schemas/webhook-schema';
import { apiError, zodIssuesToDetails } from '@/lib/api-response';

function verifySignature(payload: string, signature: string | null): boolean {
    const webhookSecret = process.env.WEBHOOK_SECRET;

    // If no secret configured, reject all webhooks in production
    if (!webhookSecret) {
        if (process.env.NODE_ENV === 'production') {
            console.error('[WEBHOOK] No WEBHOOK_SECRET configured in production');
            return false;
        }
        // Allow in development without signature
        console.warn('[WEBHOOK] No WEBHOOK_SECRET configured - skipping verification in development');
        return true;
    }

    if (!signature) {
        console.error('[WEBHOOK] Missing X-PropFlow-Signature header');
        return false;
    }

    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch {
        return false;
    }
}

export async function POST(req: NextRequest) {
    console.log('[WEBHOOK CALLBACK RECEIVED]');

    try {
        // 1. Get raw body for signature verification
        const rawBody = await req.text();
        const signature = req.headers.get('X-PropFlow-Signature');

        // 2. Verify webhook signature
        if (!verifySignature(rawBody, signature)) {
            console.error('[WEBHOOK] Invalid signature');
            return apiError('Invalid webhook signature', { status: 401 });
        }

        // 3. Parse and validate payload
        let payload;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return apiError('Invalid JSON payload', { status: 400 });
        }

        const validationResult = webhookCallbackSchema.safeParse(payload);
        if (!validationResult.success) {
            console.error('[WEBHOOK] Validation failed:', validationResult.error.issues);
            return apiError('Invalid payload', {
                status: 400,
                details: zodIssuesToDetails(validationResult.error.issues),
            });
        }

        const { application_id, status, metadata } = validationResult.data;

        const supabase = await createClient();

        // 4. Update Application Status (if requested)
        if (['approved', 'denied', 'screening'].includes(status)) {
            // Fetch the application first to verify it exists and capture its company_id
            const { data: application, error: fetchError } = await supabase
                .from('applications')
                .select('id, company_id')
                .eq('id', application_id)
                .maybeSingle();

            if (fetchError || !application) {
                return apiError('Application not found', { status: 404 });
            }

            const { error: updateError } = await supabase
                .from('applications')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', application_id)
                .eq('company_id', application.company_id);

            if (updateError) throw updateError;
        }

        // 5. Log this External Event
        const { error: logError } = await supabase
            .from('activity_log')
            .insert({
                action: 'AUTOMATION_CALLBACK',
                entity_type: 'application',
                entity_id: application_id,
                description: `Automation Update: ${status}`,
                metadata: metadata || payload
            });

        if (logError) throw logError;

        return NextResponse.json({ success: true, message: 'Callback processed' });

    } catch (error: any) {
        console.error('[CALLBACK ERROR]', error);
        return apiError('Internal Server Error', { status: 500 });
    }
}
