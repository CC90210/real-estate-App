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
 * Dispatch an automation event.
 *
 * Browser callers go through the authenticated API route.
 * Server callers dynamically import the automation engine directly.
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

    const handledEvents: AutomationEventType[] = [
        'DOCUMENT_SEND',
        'LEASE_GENERATED',
        'INVOICE_CREATED',
        'APPLICATION_SUBMITTED',
    ]

    if (!handledEvents.includes(event)) {
        return { success: true, warning: `No handler for event: ${event}` }
    }

    try {
        const { executeAutomation } = await import('./engine')
        const result = await executeAutomation(event as any, payload as any)

        return {
            success: result.success,
            id: (result.details?.email_id as string) || (result.details?.document_id as string),
            error: result.success ? undefined : result.message,
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[AUTOMATION FAILED] ${event}:`, message)
        return { success: false, error: message }
    }
}
