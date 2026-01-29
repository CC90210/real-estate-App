import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

export async function POST(req: Request) {
    try {
        const { applicationId } = await req.json();

        if (!applicationId) {
            return NextResponse.json({ error: 'Missing application ID' }, { status: 400 });
        }

        const supabase = createServerClient();

        // 1. Fetch full application details
        const { data: application, error } = await supabase
            .from('applications')
            .select(`
        *,
        property:properties(*),
        agent:profiles(*)
      `)
            .eq('id', applicationId)
            .single();

        if (error || !application) {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 });
        }

        // 2. Send to n8n if URL is configured
        if (N8N_WEBHOOK_URL) {
            try {
                await fetch(N8N_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'new_application',
                        data: application,
                        timestamp: new Date().toISOString()
                    })
                });

                // 3. Update status
                await supabase
                    .from('applications')
                    .update({
                        webhook_sent: true,
                        webhook_sent_at: new Date().toISOString()
                    })
                    .eq('id', applicationId);
            } catch (webhookError) {
                console.error('Webhook failed:', webhookError);
                // Continue but don't mark as sent
            }
        } else {
            console.log('Skipping webhook - no URL configured');
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Webhook API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
