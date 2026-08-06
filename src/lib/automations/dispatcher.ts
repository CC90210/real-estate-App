export type AutomationEventType =
    | 'APPLICATION_SUBMITTED'
    | 'APPLICATION_STATUS_CHANGED'
    | 'LEASE_GENERATED'
    | 'DOCUMENT_SEND'
    | 'FOLLOW_UP_DUE'
    | 'LISTING_PUBLISHED'
    | 'LEAD_CREATED'
    | 'MAINTENANCE_REQUESTED'
    | 'INVOICE_CREATED';

/**
 * Dispatch an automation event through the authenticated API route.
 *
 * This module is safe to import from client components. The in-process path
 * lives in ./dispatcher-server, because Turbopack traces both sides of a
 * `typeof window` branch: keeping `await import('./engine')` here dragged the
 * service-role admin client — and with it @libsql/client's native bindings —
 * into the browser bundle graph. Server callers import triggerAutomationServer
 * and pass it to the triggers in ./triggers.
 */
export async function triggerAutomation(
    event: AutomationEventType,
    payload: Record<string, unknown>
): Promise<{ success: boolean; id?: string; error?: string; warning?: string }> {
    console.log(`[AUTOMATION] ${event} for company ${(payload.company_id as string) || 'unknown'}`)

    if (typeof window !== 'undefined') {
        try {
            const response = await fetch('/api/automations/trigger', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    event_type: event,
                    payload,
                }),
            })

            const result = await response.json().catch(() => ({}))

            if (!response.ok) {
                return {
                    success: false,
                    error: result?.error || 'Failed to trigger automation',
                }
            }

            return {
                success: Boolean(result?.success),
                id: result?.logId,
                error: result?.success ? undefined : result?.message,
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error)
            console.error(`[AUTOMATION FAILED] ${event}:`, message)
            return { success: false, error: message }
        }
    }

    // Reached only on the server. Callers there should pass
    // triggerAutomationServer explicitly; this guard makes a missed call site
    // loud instead of silently dropping the automation.
    return {
        success: false,
        error: 'triggerAutomation was called on the server. Import '
            + 'triggerAutomationServer from ./dispatcher-server instead.',
    }
}
