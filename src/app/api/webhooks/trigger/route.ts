
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { apiError, zodIssuesToDetails } from '@/lib/api-response';

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500, prefix: 'api:webhooks-trigger' });

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
            return apiError('Unauthorized: Session invalid', { status: 401 });
        }

        try {
            await limiter.check(15, user.id);
        } catch {
            return apiError('Too many requests', { status: 429 });
        }

        // 1. Verify Enterprise Status (Optional for now, but good practice)
        // In a real app, check if user.company_id has an active subscription plan that includes automations.

        // 2. Parse Request Body
        const body = await request.json();
        const validation = AutomationSchema.safeParse(body);

        if (!validation.success) {
            return apiError('Invalid payload', {
                status: 400,
                details: zodIssuesToDetails(validation.error.issues),
            });
        }

        const { type, data } = validation.data;

        // 3. Construct Lean Propagation Payload
        const n8nPayload: any = {
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
            .maybeSingle();

        // SECURITY: Always use company_id from authenticated user's profile — never from request body
        const companyId = profile?.company_id;

        if (!companyId) {
            return apiError('No company found for your account', { status: 400 });
        }

        // 5. Forward to Dispatch Engine for Signed Delivery & Logging
        const { dispatchWebhook, dispatchDocumentWebhook } = await import('@/lib/webhooks/dispatcher');

        let result;

        if (type === 'invoice' && n8nPayload.invoice_id && n8nPayload.file_url !== 'DATA_ONLY_DISPATCH') {
            // New Production Flow: Generate PDF on server
            result = await dispatchDocumentWebhook(companyId, 'invoice', n8nPayload.invoice_id, n8nPayload.dispatch_notes);
        } else if (type === 'document' && n8nPayload.document_id && n8nPayload.file_url !== 'DATA_ONLY_DISPATCH') {
            result = await dispatchDocumentWebhook(companyId, 'document', n8nPayload.document_id, n8nPayload.dispatch_notes);
        } else {
            // Legacy Fallback (or Data-Only Request)
            result = await dispatchWebhook(
                companyId,
                type === 'invoice' ? 'invoice.created' : 'document.created',
                n8nPayload
            );
        }

        // If webhook dispatch failed (no URL configured, delivery error, etc.),
        // fall back to the internal automation engine which sends email directly via Resend.
        if (!result?.success) {
            const { executeAutomation } = await import('@/lib/automations/engine');

            const event = type === 'document' ? 'DOCUMENT_SEND' as const : 'INVOICE_CREATED' as const;
            const enginePayload = {
                company_id: companyId,
                document_id: n8nPayload.document_id,
                document_type: n8nPayload.document_type,
                document_url: n8nPayload.file_url,
                recipient_email: n8nPayload.recipient_email,
                recipient_name: n8nPayload.recipient_name,
                property_address: n8nPayload.property_address,
                agent_name: n8nPayload.meta?.operator,
                message: n8nPayload.dispatch_notes,
                invoice_number: n8nPayload.invoice_number,
                amount: n8nPayload.amount,
                due_date: n8nPayload.due_date,
                sender_id: user.id,
            };

            const engineResult = await executeAutomation(event, enginePayload);

            if (!engineResult.success) {
                return apiError(engineResult.message || 'Automation failed', { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: engineResult.message || 'Automation completed via internal engine',
                details: engineResult.details,
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Automation Triggered Successfully via Central Dispatch'
        });

    } catch (error: unknown) {
        // Point 6: Generic Error in production-like responses
        console.error('Automation Trigger API Error:', error);
        return apiError('Something went wrong. Please try again.', { status: 500 });
    }
}
