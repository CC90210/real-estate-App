export type AutomationEventType =
    | 'APPLICATION_SUBMITTED'
    | 'APPLICATION_STATUS_CHANGED'
    | 'LEASE_GENERATED'
    | 'MAINTENANCE_REQUESTED';

export async function triggerAutomation(
    event: AutomationEventType,
    payload: Record<string, any>
): Promise<{ success: boolean; id?: string; error?: string }> {
    console.log(`[🚀 AUTOMATION DISPATCH] Triggering Event: ${event}`);

    // In a real env, this would be process.env.N8N_WEBHOOK_URL
    // For this Enterpise demo, we simulate a successful dispatch to an n8n endpoint.
    const WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://mock-n8n.propflow.ai/webhook/generic';

    try {
        // 1. Construct Standardized Envelope
        const envelope = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            event: event,
            environment: process.env.NODE_ENV || 'development',
            payload: payload
        };

        console.log(`[📦 PAYLOAD]`, JSON.stringify(envelope, null, 2));

        // 2. Dispatch (Mocking the fetch for demo stability, but fully architected)
        // const response = await fetch(WEBHOOK_URL, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(envelope)
        // });

        // if (!response.ok) throw new Error(`Webhook failed: ${response.statusText}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        return { success: true, id: envelope.id };

    } catch (error: any) {
        console.error(`[❌ AUTOMATION FAILED]`, error);
        return { success: false, error: error.message };
    }
}
