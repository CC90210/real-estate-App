
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

        // 3. Construct Lean Propagation Payload
        const n8nPayload = {
            ...data,
            meta: {
                operator: user.email,
                env: process.env.NODE_ENV
            }
        };

        // 4. Fetch User Profile to get Company ID
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();

        const companyId = profile?.company_id || data.company_id;

        if (!companyId) {
            return NextResponse.json({ error: 'Company ID required for automation dispatches' }, { status: 400 });
        }

        // 5. Forward to Dispatch Engine for Signed Delivery & Logging
        const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');

        const result = await dispatchWebhook(
            companyId,
            type === 'invoice' ? 'invoice.created' : 'document.created',
            n8nPayload
        );

        if (!result?.success) {
            throw new Error(`Dispatch Engine rejected delivery. Check webhook_events log for company ${companyId}`);
        }

        return NextResponse.json({
            success: true,
            message: 'Automation Triggered Successfully via Central Dispatch'
        });

    } catch (error: any) {
        console.error('Automation Trigger API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', message: error.message },
            { status: 500 }
        );
    }
}
