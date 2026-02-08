
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Zod Schema for validation
const AutomationSchema = z.object({
    type: z.enum(['document', 'invoice']),
    data: z.record(z.string(), z.any())
});

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: Session invalid' }, { status: 401 });
        }

        // 1. Verify Enterprise Status (Optional for now, but good practice)
        // In a real app, check if user.company_id has an active subscription plan that includes automations.

        // 2. Parse Request Body
        const body = await request.json();
        const validation = AutomationSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid Payload', details: validation.error }, { status: 400 });
        }

        const { type, data } = validation.data;

        // 3. Construct N8N Webhook Payload
        const n8nPayload = {
            ...data,
            meta: {
                triggered_by: user.email,
                user_id: user.id,
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV
            }
        };

        // 4. Forward to N8N Webhook URL
        // User's New Production Hook for Intelligent Automation
        let n8nWebhookUrl = 'https://n8n.srv993801.hstgr.cloud/webhook/ad6dd389-7003-4276-9f6c-5eec3836020d';

        if (!n8nWebhookUrl) {
            console.warn('N8N_WEBHOOK_URL is not configured. Automation payload logged but not sent.');
            return NextResponse.json({
                success: true,
                message: 'Automation queued (Simulation Mode: No Webhook URL)',
                payload: n8nPayload
            });
        }

        const n8nResponse = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Source': 'PropFlow-App'
            },
            body: JSON.stringify(n8nPayload)
        });

        if (!n8nResponse.ok) {
            throw new Error(`N8N Gateway Error: ${n8nResponse.statusText}`);
        }

        return NextResponse.json({ success: true, message: 'Automation Triggered Successfully' });

    } catch (error: any) {
        console.error('Automation Trigger API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', message: error.message },
            { status: 500 }
        );
    }
}
