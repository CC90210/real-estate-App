import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-logger'
import { guardPropertyCreation } from '@/lib/api-guards'
import { z } from 'zod';

// Point 2: Schema to prevent mass assignment
const propertySchema = z.object({
    address: z.string().min(5).max(254),
    city: z.string().max(100).optional(),
    rent: z.number().positive().max(100000),
    bedrooms: z.number().int().min(0).max(20),
    bathrooms: z.number().min(0).max(20),
    status: z.enum(['available', 'rented', 'maintenance']),
    available_date: z.string().optional(),
    amenities: z.array(z.string()).max(50).optional()
});

export async function POST(req: Request) {
    // ✅ CHECK PLAN LIMITS FIRST
    const guard = await guardPropertyCreation()
    if (guard.error) return guard.error

    const { companyId, user } = guard
    const supabase = await createClient()

    try {
        const body = await req.json()
        const validation = propertySchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({
                error: 'Invalid property data',
                details: validation.error.flatten().fieldErrors
            }, { status: 400 });
        }

        const data = validation.data;

        // 1. Handle Location / Area
        let areaId: string | null = null;
        const cityName = data.city || "General Area";

        const { data: existingArea } = await supabase
            .from('areas')
            .select('id')
            .eq('company_id', companyId)
            .eq('name', cityName)
            .maybeSingle();

        if (existingArea) {
            areaId = existingArea.id;
        } else {
            const { data: newArea, error: areaError } = await supabase
                .from('areas')
                .insert({
                    company_id: companyId,
                    name: cityName,
                    description: `Properties located in ${cityName}`,
                    image_url: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&crop=entropy'
                })
                .select()
                .single();

            if (areaError) throw areaError;
            areaId = newArea.id;
        }

        // 2. Create Building (The "House" Wrapper)
        const { data: building, error: buildingError } = await supabase
            .from('buildings')
            .insert({
                company_id: companyId,
                area_id: areaId,
                name: data.address, // For SFH, Building Name = Address
                address: data.address,
                image_url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&crop=entropy',
                amenities: []
            })
            .select()
            .single();

        if (buildingError) throw buildingError;

        // 3. Create Unit (The actual "Property")
        // Point 7: Only insert explicitly validated fields
        const { data: property, error: unitError } = await supabase
            .from('properties')
            .insert({
                address: data.address,
                rent: data.rent,
                bedrooms: data.bedrooms,
                bathrooms: data.bathrooms,
                status: data.status,
                available_date: data.available_date,
                building_id: building.id,
                company_id: companyId,
                amenities: data.amenities || []
            })
            .select()
            .single();

        if (unitError) throw unitError;

        // Log activity
        await logActivity(supabase, {
            companyId,
            userId: user.id,
            action: 'created',
            entityType: 'property',
            entityId: property.id,
            description: `Created new property: ${data.address}`,
            details: { address: data.address }
        })

        return NextResponse.json(property)

    } catch (error: unknown) {
        // Point 6: Sanitize error response
        console.error('Property creation error:', error)
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}

export async function GET(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
        .from('properties')
        .select('*, buildings(name, address), areas(name)')
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
