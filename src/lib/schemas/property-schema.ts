import * as z from 'zod';

export const propertySchema = z.object({
    // Basic Details
    unit_number: z.string().min(1, "Unit number is required"),
    address: z.string().min(1, "Address is required"), // Full address (computed or explicit)

    // Financials
    rent: z.number().min(0, "Rent must be positive"),
    deposit: z.number().min(0).optional(),

    // Specs
    bedrooms: z.number().min(0),
    bathrooms: z.number().min(0),
    square_feet: z.number().positive().optional(),

    // Marketing
    description: z.string().optional(),
    amenities: z.array(z.string()).optional(),
    available_date: z.date().optional(),

    // System Status
    status: z.enum(['available', 'pending', 'rented', 'maintenance']).default('available'),

    // UI Helpers (Not in DB Property Table, but used for SFH Creation)
    city: z.string().optional(),
    state: z.string().optional(),
    zip_code: z.string().optional(),

    // Relationships
    building_id: z.string().uuid().optional(), // Optional because SFH flow creates it on fly
    landlord_id: z.string().uuid("Landlord ID is required"),
    company_id: z.string().uuid("Company ID is required").optional() // Often injected by backend/session
});

export type PropertyFormValues = z.infer<typeof propertySchema>;
