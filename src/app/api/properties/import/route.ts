
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-logger'
import Papa from 'papaparse'

export async function POST(req: Request) {
    const supabase = await createClient()

    // Get user and company
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

    if (!profile?.company_id) {
        return NextResponse.json({ error: 'No company' }, { status: 400 })
    }

    // Parse the uploaded file
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()

    // Parse CSV
    const { data: rows, errors } = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().trim().replace(/\s+/g, '_')
    })

    if (errors.length > 0) {
        return NextResponse.json({
            error: 'CSV parsing failed',
            details: errors
        }, { status: 400 })
    }

    // Validate and transform rows
    const properties: Record<string, any>[] = []
    const validationErrors: { row: number; error: string }[] = []

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as any

        // Required fields
        if (!row.address) {
            validationErrors.push({ row: i + 2, error: 'Missing address' })
            continue
        }

        properties.push({
            company_id: profile.company_id,
            address: row.address,
            unit_number: row.unit_number || row.unit || null,
            rent: parseFloat(row.rent) || null,
            bedrooms: parseInt(row.bedrooms) || null,
            bathrooms: parseFloat(row.bathrooms) || null,
            square_feet: parseInt(row.square_feet || row.sqft) || null,
            description: row.description || null,
            status: row.status || 'available',
            // property_type column might not exist in the schema I saw earlier, I'll check schema.sql. 
            // The prompt says "No new tables needed - imports into existing properties table".
            // Checking schema.sql from previous turn: properties table has no 'property_type'.
            // I will omit it to be safe or check if I should add it.
            // The prompt "WHAT'S ALREADY BUILT" implies I shouldn't break existing stuff.
            // But the code provided in the prompt includes `property_type`.
            // I will err on the side of safety and OMIT it if it's not in the DB, OR I'll add the column if deemed necessary.
            // Given "Build them WITHOUT breaking existing functionality", I'll stick to existing columns unless critical.
            // The schema.sql showed: id, building_id, unit_number, bedrooms, bathrooms, square_feet, rent, deposit, status, available_date, description, amenities, utilities_included, pet_policy, parking_included, lockbox_code.
            // I will map to these. I will exclude 'property_type' if it doesn't exist.
            // However, the prompt code explicitly has it.
            // I will check if I can add it safely.
            // Actually, I'll just remove it from the insert for now to avoid error 42703 (undefined column).
        })
    }

    if (properties.length === 0) {
        return NextResponse.json({
            error: 'No valid properties found',
            validationErrors
        }, { status: 400 })
    }

    // Insert properties
    const { data: inserted, error: insertError } = await supabase
        .from('properties')
        .insert(properties)
        .select()

    if (insertError) {
        // If it fails, it might be due to missing columns or constraints.
        return NextResponse.json({
            error: 'Failed to import',
            details: insertError.message
        }, { status: 500 })
    }

    // Log activity
    await logActivity(supabase, {
        companyId: profile.company_id,
        userId: user.id,
        action: 'imported',
        entityType: 'properties',
        description: `Imported ${inserted.length} properties from CSV`,
        details: { count: inserted.length }
    })

    return NextResponse.json({
        success: true,
        imported: inserted.length,
        errors: validationErrors
    })
}
