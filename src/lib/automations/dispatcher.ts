import { executeAutomation, type AutomationEvent, type AutomationPayload } from './engine'

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
 * V2: Executes handlers INLINE via the TypeScript engine.
 * No external Python/n8n service needed — everything runs on Vercel.
 */
export async function triggerAutomation(
    event: AutomationEventType,
    payload: Record<string, unknown>
): Promise<{ success: boolean; id?: string; error?: string; warning?: string }> {
    console.log(`[AUTOMATION] ${event} for company ${(payload.company_id as string) || 'unknown'}`)

    // Only process events that have handlers
    const handledEvents: AutomationEvent[] = [
        'DOCUMENT_SEND',
        'LEASE_GENERATED',
        'INVOICE_CREATED',
        'APPLICATION_SUBMITTED',
    ]

    if (!handledEvents.includes(event as AutomationEvent)) {
        return { success: true, warning: `No handler for event: ${event}` }
    }

    try {
        const result = await executeAutomation(event as AutomationEvent, payload as AutomationPayload)

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
