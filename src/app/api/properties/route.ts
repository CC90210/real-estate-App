import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { guardPropertyCreation } from '@/lib/api-guards'

export async function POST(req: Request) {
    // ✅ CHECK PLAN LIMITS FIRST
    const guard = await guardPropertyCreation()
    if (guard.error) return guard.error

    const { companyId, user } = guard
    const supabase = await createClient()

    try {
        const data = await req.json()

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
                    image_url: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&q=80'
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
                image_url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80',
                amenities: []
            })
            .select()
            .single();

        if (buildingError) throw buildingError;

        // 3. Create Unit (The actual "Property")
        const { data: property, error: unitError } = await supabase
            .from('properties')
            .insert({
                ...data,
                building_id: building.id,
                company_id: companyId,
                amenities: data.amenities || []
            })
            .select()
            .single();

        if (unitError) throw unitError;

        // Log activity
        await supabase.from('activity_log').insert({
            company_id: companyId,
            user_id: user.id,
            action: 'created',
            entity_type: 'property',
            entity_id: property.id,
            details: { address: data.address }
        })

        return NextResponse.json(property)

    } catch (error: any) {
        console.error('Property creation error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
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
