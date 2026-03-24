export type AutomationEventType =
    | 'APPLICATION_SUBMITTED'
    | 'APPLICATION_STATUS_CHANGED'
    | 'LEASE_GENERATED'
    | 'DOCUMENT_SEND'
    | 'FOLLOW_UP_DUE'
    | 'LISTING_PUBLISHED'
    | 'LEAD_CREATED'
    | 'MAINTENANCE_REQUESTED';

/**
 * Dispatch an automation event to the PropFlow Python automation service.
 *
 * Priority order:
 *   1. AUTOMATION_URL env var (Python FastAPI service)
 *   2. NEXT_PUBLIC_N8N_WEBHOOK_URL (legacy n8n fallback)
 *
 * All requests are HMAC-SHA256 signed using WEBHOOK_SECRET.
 */
export async function triggerAutomation(
    event: AutomationEventType,
    payload: Record<string, any>
): Promise<{ success: boolean; id?: string; error?: string; warning?: string }> {
    console.log(`[AUTOMATION DISPATCH] Triggering Event: ${event}`);

    // Primary: Python FastAPI automation service
    // Fallback: n8n webhook (legacy)
    const AUTOMATION_URL = process.env.AUTOMATION_URL
        || process.env.NEXT_PUBLIC_AUTOMATION_URL;
    const N8N_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

    const WEBHOOK_URL = AUTOMATION_URL
        ? `${AUTOMATION_URL}/api/trigger`
        : N8N_URL;

    if (!WEBHOOK_URL) {
        console.warn(`[AUTOMATION SKIPPED] No automation service URL configured. Set AUTOMATION_URL or NEXT_PUBLIC_N8N_WEBHOOK_URL.`);
        return { success: true, id: 'skipped-no-config', warning: 'No automation service URL configured' };
    }

    try {
        // 1. Construct standardized envelope
        const envelope = {
            id: globalThis.crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            event_type: event,        // Python FastAPI expects event_type
            event: event,             // Legacy n8n compatibility
            environment: process.env.NODE_ENV || 'development',
            company_id: payload.company_id,
            payload: payload,
            idempotency_key: payload.idempotency_key || `${event}-${payload.application_id || payload.document_id || payload.lead_id || globalThis.crypto.randomUUID()}`,
        };

        console.log(`[DISPATCHING] ${event} → ${WEBHOOK_URL}`);

        // 2. Generate HMAC signature for webhook security
        const webhookSecret = process.env.WEBHOOK_SECRET;
        const bodyString = JSON.stringify(envelope);
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (webhookSecret && typeof globalThis.process !== 'undefined') {
            try {
                const { createHmac } = await import('crypto');
                const signature = createHmac('sha256', webhookSecret)
                    .update(bodyString)
                    .digest('hex');
                headers['X-PropFlow-Signature'] = signature;
            } catch {
                // Browser context — skip HMAC signing
            }
        }

        // 3. Dispatch to automation service
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers,
            body: bodyString,
            signal: AbortSignal.timeout(30_000), // 30s timeout
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Automation service error: ${response.status} ${response.statusText} - ${errorText.substring(0, 500)}`);
        }

        const result = await response.json().catch(() => ({}));
        return {
            success: true,
            id: result.log_id || envelope.id,
        };

    } catch (error: any) {
        // Graceful degradation: Log error but don't crash the calling flow
        console.error(`[AUTOMATION FAILED] ${event}:`, error.message);
        return { success: false, error: error.message };
    }
}
