import { z } from 'zod';

export const applicationSchema = z.object({
    applicant_name: z.string().min(1, 'Applicant name is required').max(255),
    applicant_email: z.string().email('Invalid email address'),
    applicant_phone: z.string().min(1, 'Phone number is required'),
    property_id: z.string().uuid('Invalid property ID'),
    monthly_income: z.number().positive('Income must be positive').optional(),
    credit_score: z.number().int().min(300).max(850).optional(),
    employment_status: z.string().optional(),
    employer_name: z.string().optional(),
    current_address: z.string().optional(),
    employer: z.string().optional(),
    move_in_date: z.string().optional(),
    num_occupants: z.number().int().min(1).default(1),
    has_pets: z.boolean().default(false),
    pet_details: z.string().optional(),
    notes: z.string().max(2000).optional(),
    additional_notes: z.string().max(2000).optional(),
    agent_id: z.string().uuid().optional(),
    created_by: z.string().uuid().optional(),
});

export const applicationStatusSchema = z.object({
    id: z.string().uuid('Invalid application ID'),
    status: z.enum(['pending', 'screening', 'approved', 'denied', 'withdrawn']),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
export type ApplicationStatusUpdate = z.infer<typeof applicationStatusSchema>;
