import { z } from 'zod';

export const webhookCallbackSchema = z.object({
    application_id: z.string().uuid(),
    status: z.enum(['approved', 'denied', 'screening', 'pending']),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export const automationEnvelopeSchema = z.object({
    id: z.string().uuid(),
    timestamp: z.string().datetime(),
    event: z.enum([
        'APPLICATION_SUBMITTED',
        'APPLICATION_STATUS_CHANGED',
        'LEASE_GENERATED',
        'MAINTENANCE_REQUESTED'
    ]),
    environment: z.string(),
    payload: z.record(z.string(), z.unknown()),
});

export type WebhookCallbackInput = z.infer<typeof webhookCallbackSchema>;
export type AutomationEnvelope = z.infer<typeof automationEnvelopeSchema>;
