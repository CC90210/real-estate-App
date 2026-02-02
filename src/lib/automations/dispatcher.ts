import crypto from 'crypto';

export type AutomationEventType =
    | 'APPLICATION_SUBMITTED'
    | 'APPLICATION_STATUS_CHANGED'
    | 'LEASE_GENERATED'
    | 'MAINTENANCE_REQUESTED';

export async function triggerAutomation(
    event: AutomationEventType,
    payload: Record<string, any>
): Promise<{ success: boolean; id?: string; error?: string; warning?: string }> {
    console.log(`[🚀 AUTOMATION DISPATCH] Triggering Event: ${event}`);

    // 🚀 PRODUCTION MODE: Real Network Dispatch
    const WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

    if (!WEBHOOK_URL) {
        console.warn(`[⚠️ AUTOMATION SKIPPED] Missing NEXT_PUBLIC_N8N_WEBHOOK_URL env var.`);
        return { success: true, id: 'skipped-no-env', warning: 'No Webhook URL configured' };
    }

    try {
        // 1. Construct Standardized Envelope
        const envelope = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            event: event,
            environment: process.env.NODE_ENV || 'development',
            payload: payload
        };

        console.log(`[📦 DISPATCHING]`, JSON.stringify(envelope, null, 2));

        // 2. Generate HMAC signature for webhook security
        const webhookSecret = process.env.WEBHOOK_SECRET;
        const bodyString = JSON.stringify(envelope);
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (webhookSecret) {
            const signature = crypto
                .createHmac('sha256', webhookSecret)
                .update(bodyString)
                .digest('hex');
            headers['X-PropFlow-Signature'] = signature;
        }

        // 3. Dispatch to n8n (or other IPaaS)
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers,
            body: bodyString
        });

        if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
        }

        return { success: true, id: envelope.id };

    } catch (error: any) {
        // Graceful degradation: Log error but don't crash usage flow
        console.error(`[❌ AUTOMATION FAILED]`, error);
        return { success: false, error: error.message };
    }
}
