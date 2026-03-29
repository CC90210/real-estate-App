import { z } from 'zod'

// ============================================================================
// Shared API Input Validation Schemas
// ============================================================================

// Reusable primitives
const uuid = z.string().uuid()
const safeString = (max: number) => z.string().max(max).trim()
const positiveNumber = z.number().positive().max(10_000_000)
const nonNegativeNumber = z.number().min(0).max(10_000_000)

// ── Leases ──────────────────────────────────────────────────────────────────

export const createLeaseSchema = z.object({
    property_id: uuid,
    tenant_name: safeString(200).min(1, 'Tenant name is required'),
    tenant_email: z.string().email('Invalid email').max(254),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format (YYYY-MM-DD)'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format (YYYY-MM-DD)'),
    rent_amount: z.union([z.number(), z.string().transform(Number)]).pipe(positiveNumber),
    deposit_amount: z.union([z.number(), z.string().transform(Number)]).pipe(nonNegativeNumber).optional().default(0),
    payment_day: z.union([z.number(), z.string().transform(Number)]).pipe(z.number().int().min(1).max(31)).optional().default(1),
    auto_renew: z.boolean().optional().default(false),
    notes: safeString(5000).optional().nullable(),
}).refine(data => new Date(data.end_date) > new Date(data.start_date), {
    message: 'End date must be after start date',
    path: ['end_date'],
})

// ── Maintenance ─────────────────────────────────────────────────────────────

const maintenanceCategories = ['general', 'plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest', 'other'] as const
const maintenancePriorities = ['low', 'medium', 'high', 'emergency'] as const
const maintenanceStatuses = ['pending', 'in_progress', 'scheduled', 'completed', 'cancelled'] as const

export const createMaintenanceSchema = z.object({
    property_id: uuid,
    title: safeString(200).min(1, 'Title is required'),
    description: safeString(5000).optional().nullable(),
    category: z.enum(maintenanceCategories).optional().default('general'),
    priority: z.enum(maintenancePriorities).optional().default('medium'),
    photos: z.array(z.string().url().max(2048)).max(20).optional().default([]),
})

export const updateMaintenanceSchema = z.object({
    id: uuid,
    status: z.enum(maintenanceStatuses).optional(),
    resolution_notes: safeString(5000).optional(),
    assigned_to: uuid.optional(),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date').optional(),
    estimated_cost: nonNegativeNumber.optional(),
    actual_cost: nonNegativeNumber.optional(),
})

// ── Automations ─────────────────────────────────────────────────────────────

const automationEvents = [
    'lease_created', 'lease_updated', 'lease_expiring',
    'maintenance_created', 'maintenance_updated', 'maintenance_completed',
    'invoice_created', 'invoice_sent', 'invoice_paid', 'invoice_overdue',
    'application_received', 'application_approved', 'application_rejected',
    'tenant_moved_in', 'tenant_moved_out',
    'payment_received', 'payment_failed',
    'document_generated', 'document_signed',
    'showing_scheduled', 'showing_completed',
    'custom',
    'APPLICATION_SUBMITTED', 'APPLICATION_STATUS_CHANGED',
    'LEASE_GENERATED', 'DOCUMENT_SEND',
    'FOLLOW_UP_DUE', 'LISTING_PUBLISHED',
    'LEAD_CREATED', 'MAINTENANCE_REQUESTED',
    'INVOICE_CREATED',
] as const

export const triggerAutomationSchema = z.object({
    event_type: z.enum(automationEvents).optional(),
    actionType: z.enum(automationEvents).optional(),
    event: z.enum(automationEvents).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
}).refine(data => data.event_type || data.actionType || data.event, {
    message: 'One of event_type, actionType, or event is required',
})

// ── Dispatch ────────────────────────────────────────────────────────────────

const documentTypes = ['invoice', 'document'] as const

export const dispatchDocumentSchema = z.object({
    documentType: z.enum(documentTypes),
    documentId: uuid,
    dispatchNotes: safeString(2000).optional(),
})

export const sendDocumentSchema = z.object({
    documentId: uuid.optional(),
    applicationId: uuid.optional(),
    propertyId: uuid.optional(),
    recipientEmail: z.string().email('Invalid email').max(254).trim().optional(),
    recipientName: safeString(200).optional().nullable(),
    selectedDocuments: z.array(safeString(100).min(1)).min(1).max(20).optional().default(['lease_agreement']),
    message: safeString(2000).optional().nullable(),
    eSignEnabled: z.boolean().optional().default(false),
    eSignProvider: safeString(50).optional().nullable(),
    requireCounterSign: z.boolean().optional().default(true),
})

// ── Helper ──────────────────────────────────────────────────────────────────

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
    const result = schema.safeParse(body)
    if (!result.success) {
        const firstError = result.error.issues[0]
        return { success: false, error: `${firstError.path.join('.')}: ${firstError.message}` }
    }
    return { success: true, data: result.data }
}
