
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Point 2: Define strict validation schema
const singleKeySchema = z.object({
    application_id: z.string().uuid(),
    report_url: z.string().url(),
    score: z.number().int().min(300).max(900).optional(),
    status: z.string().max(50).optional()
});

export async function POST(request: Request) {
    try {
        // Point 9: Validate secret token (Strictly required for production)
        const secret = request.headers.get('x-singlekey-secret');
        if (!secret || secret !== process.env.SINGLEKEY_WEBHOOK_SECRET) {
            console.error('Unauthorized SingleKey Webhook attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Point 2: Validate Input
        const validation = singleKeySchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const { application_id, report_url, score, status } = validation.data;

        // 1. Log incoming webhook for audit
        console.log('SingleKey Webhook Received for Application:', application_id);

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

        // 4. TRIGGER NOTIFICATION (Notify Landlord)
        const landlordId = application.property?.owner_id;
        if (landlordId) {
            await supabase.from('activity_log').insert({
                user_id: landlordId,
                action: 'SCREEN_READY',
                description: `New screening report ready for ${application.applicant_name} at ${application.property?.address}`
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        // Point 6: Generic Error
        console.error('Webhook Endpoint Failure:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
