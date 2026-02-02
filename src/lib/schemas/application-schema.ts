import { z } from 'zod';

export const applicationSchema = z.object({
    applicant_name: z.string().min(1, 'Applicant name is required').max(255),
    applicant_email: z.string().email('Invalid email address'),
    applicant_phone: z.string().optional(),
    property_id: z.string().uuid('Invalid property ID'),
    monthly_income: z.number().positive('Income must be positive').optional(),
    credit_score: z.number().int().min(300).max(850).optional(),
    employment_status: z.string().optional(),
    employer_name: z.string().optional(),
    move_in_date: z.string().optional(),
    notes: z.string().max(2000).optional(),
});

export const applicationStatusSchema = z.object({
    id: z.string().uuid('Invalid application ID'),
    status: z.enum(['pending', 'screening', 'approved', 'denied', 'withdrawn']),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
export type ApplicationStatusUpdate = z.infer<typeof applicationStatusSchema>;
