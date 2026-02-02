import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { webhookCallbackSchema } from '@/lib/schemas/webhook-schema';

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
            return NextResponse.json(
                { error: 'Invalid webhook signature' },
                { status: 401 }
            );
        }

        // 3. Parse and validate payload
        let payload;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON payload' },
                { status: 400 }
            );
        }

        const validationResult = webhookCallbackSchema.safeParse(payload);
        if (!validationResult.success) {
            console.error('[WEBHOOK] Validation failed:', validationResult.error.issues);
            return NextResponse.json(
                { error: 'Invalid payload', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { application_id, status, metadata } = validationResult.data;

        const supabase = await createClient();

        // 4. Update Application Status (if requested)
        if (['approved', 'denied', 'screening'].includes(status)) {
            const { error: updateError } = await supabase
                .from('applications')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', application_id);

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
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
