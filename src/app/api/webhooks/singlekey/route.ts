
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Log incoming webhook for audit
        console.log('SingleKey Webhook Received:', body);

        // 2. Validate essential fields
        const { application_id, report_url, score, status } = body;

        if (!application_id) {
            return NextResponse.json({ error: 'Missing application_id' }, { status: 400 });
        }

        const supabase = await createClient();

        // 3. Update application in database
        const { data: application, error: updateError } = await supabase
            .from('applications')
            .update({
                singlekey_report_url: report_url,
                credit_score: score,
                background_status: status || 'completed',
                status: 'screening' // Move to screening status once results are in
            })
            .eq('id', application_id)
            .select('*, property:properties(owner_id)')
            .single();

        if (updateError) {
            console.error('Database Update Failed:', updateError);
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

        // 4. TRIGGER NOTIFICATION (Crucial: Notify Landlord, NOT Agent)
        const landlordId = application.property?.owner_id;
        if (landlordId) {
            // Mocking a notification insertion
            await supabase.from('activity_log').insert({
                user_id: landlordId,
                action: 'SCREEN_READY',
                description: `New screening report ready for ${application.applicant_name} at ${application.property?.address}`
            });

            console.log(`Notification queued for Landlord: ${landlordId}`);
        }

        return NextResponse.json({ success: true, message: 'Webhook processed successfully' });

    } catch (error: any) {
        console.error('Webhook Endpoint Failure:', error);
        return NextResponse.json({ error: error.message || 'Internal processing error' }, { status: 500 });
    }
}
