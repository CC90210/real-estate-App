import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { apiError, zodIssuesToDetails } from '@/lib/api-response';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

const schema = z.object({
    applicationId: z.string().uuid()
});

export async function POST(req: Request) {
    try {
        // Point 4: Auth Check (Ensure internal call is authorized)
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return apiError('Unauthorized', { status: 401 });
        }

        // Point 2: Validate Input
        const body = await req.json();
        const validation = schema.safeParse(body);

        if (!validation.success) {
            return apiError('Invalid application ID', {
                status: 400,
                code: 'VALIDATION_ERROR',
                details: zodIssuesToDetails(validation.error.issues),
            });
        }

        const { applicationId } = validation.data;

        // Use service role client for fetching data across companies if needed, 
        // but restrict by company_id for security.
        const supabaseAdmin = createServerClient();

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle();

        if (!profile?.company_id) {
            return apiError('Forbidden', { status: 403 });
        }

        // 1. Fetch full application details (Ensuring company isolation)
        const { data: application, error } = await supabaseAdmin
            .from('applications')
            .select(`
                *,
                property:properties(*),
                agent:profiles(*)
            `)
            .eq('id', applicationId)
            .eq('company_id', profile.company_id)
            .maybeSingle();

        if (error || !application) {
            return apiError('Not Found', { status: 404 });
        }

        // 2. Send to n8n if URL is configured
        if (N8N_WEBHOOK_URL) {
            try {
                // Point 9: Outbound webhook with timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

                await fetch(N8N_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'manual_trigger',
                        data: application,
                        triggered_by: user.id,
                        timestamp: new Date().toISOString()
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                // 3. Update status
                await supabaseAdmin
                    .from('applications')
                    .update({
                        webhook_sent: true,
                        webhook_sent_at: new Date().toISOString()
                    })
                    .eq('id', applicationId)
                    .eq('company_id', profile.company_id);
            } catch (webhookError) {
                console.error('Outbound Webhook failed:', webhookError);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        // Point 6: Generic Error
        console.error('Webhook API Error:', error);
        return apiError('Internal Server Error', { status: 500 });
    }
}
