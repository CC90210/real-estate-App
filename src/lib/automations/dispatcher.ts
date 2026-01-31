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

        // 2. Dispatch to n8n (or other IPaaS)
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(envelope)
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
