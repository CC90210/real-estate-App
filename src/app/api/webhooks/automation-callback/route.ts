import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    console.log('[🔔 WEBHOOK CALLBACK RECEIVED]');

    try {
        const payload = await req.json();
        const { application_id, status, metadata } = payload;

        if (!application_id || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Update Application Status (if requested)
        // If the automation says "Screening Complete", we might update status to 'screening' or 'approved'
        if (['approved', 'denied', 'screening'].includes(status)) {
            const { error: updateError } = await supabase
                .from('applications')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', application_id);

            if (updateError) throw updateError;
        }

        // 2. Log this External Event
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
        console.error('[❌ CALLBACK ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
