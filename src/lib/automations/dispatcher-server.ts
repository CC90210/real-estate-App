import "server-only";
/**
 * Server-side automation dispatch — executes the engine in-process.
 *
 * This lives apart from dispatcher.ts because the engine reaches the
 * service-role admin client, and under Turso that pulls in @libsql/client's
 * native bindings. dispatcher.ts is imported by client components (the new
 * application form, the invoice pages), and Turbopack traces BOTH sides of a
 * runtime `typeof window` branch — including `await import('./engine')` — so
 * keeping the server path in dispatcher.ts put a native module in the browser
 * bundle graph and failed the build on `server-only`.
 *
 * Under Supabase this was invisible: @supabase/supabase-js is isomorphic, so a
 * client component transitively importing the service-role client bundled
 * without complaint. The edge was always wrong; libsql just made it loud.
 *
 * Server callers pass this to the triggers in ./triggers as their `dispatch`.
 */
import type { AutomationEventType } from "./dispatcher";

export async function triggerAutomationServer(
    event: AutomationEventType,
    payload: Record<string, unknown>
): Promise<{ success: boolean; id?: string; error?: string; warning?: string }> {
    console.log(
        `[AUTOMATION] ${event} for company ${(payload.company_id as string) || "unknown"}`
    );

    const handledEvents: AutomationEventType[] = [
        "DOCUMENT_SEND",
        "LEASE_GENERATED",
        "INVOICE_CREATED",
        "APPLICATION_SUBMITTED",
    ];

    if (!handledEvents.includes(event)) {
        return { success: true, warning: `No handler for event: ${event}` };
    }

    try {
        const { executeAutomation } = await import("./engine");
        const result = await executeAutomation(event as any, payload as any);

        return {
            success: result.success,
            id:
                (result.details?.email_id as string) ||
                (result.details?.document_id as string),
            error: result.success ? undefined : result.message,
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[AUTOMATION FAILED] ${event}:`, message);
        return { success: false, error: message };
    }
}
