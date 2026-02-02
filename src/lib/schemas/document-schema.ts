import { z } from 'zod';

export const documentTypeSchema = z.enum([
    'property_summary',
    'lease_proposal',
    'showing_sheet',
    'application_summary'
]);

export const generateDocumentSchema = z.object({
    type: documentTypeSchema,
    propertyId: z.string().uuid().optional(),
    applicantId: z.string().uuid().optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
});

export const createDocumentSchema = z.object({
    type: documentTypeSchema,
    title: z.string().min(1).max(255),
    content: z.record(z.string(), z.unknown()),
    property_id: z.string().uuid().optional().nullable(),
    application_id: z.string().uuid().optional().nullable(),
    pdf_url: z.string().url().optional().nullable(),
});

export type DocumentType = z.infer<typeof documentTypeSchema>;
export type GenerateDocumentInput = z.infer<typeof generateDocumentSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
