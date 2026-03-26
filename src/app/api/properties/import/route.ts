
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-logger'
import Papa from 'papaparse'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500 })

export async function POST(req: Request) {
    const supabase = await createClient()

    // Get user and company
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        await limiter.check(3, user.id) // CSV imports are heavy — 3/min max
    } catch {
        return NextResponse.json({ error: 'Too many import requests' }, { status: 429 })
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

    // Limit import size to prevent memory exhaustion
    if (rows.length > 5000) {
        return NextResponse.json({
            error: `CSV too large (${rows.length} rows). Maximum 5,000 properties per import.`
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

        if (row.address.length > 500) {
            validationErrors.push({ row: i + 2, error: 'Address too long (max 500 chars)' })
            continue
        }

        const validStatuses = ['available', 'occupied', 'maintenance', 'unavailable']
        const status = row.status && validStatuses.includes(row.status.toLowerCase()) ? row.status.toLowerCase() : 'available'

        const rent = parseFloat(row.rent)
        const bedrooms = parseInt(row.bedrooms)
        const bathrooms = parseFloat(row.bathrooms)
        const sqft = parseInt(row.square_feet || row.sqft)

        properties.push({
            company_id: profile.company_id,
            address: row.address.slice(0, 500),
            unit_number: (row.unit_number || row.unit || '').slice(0, 50) || null,
            rent: (!isNaN(rent) && rent >= 0 && rent <= 10_000_000) ? rent : null,
            bedrooms: (!isNaN(bedrooms) && bedrooms >= 0 && bedrooms <= 100) ? bedrooms : null,
            bathrooms: (!isNaN(bathrooms) && bathrooms >= 0 && bathrooms <= 100) ? bathrooms : null,
            square_feet: (!isNaN(sqft) && sqft >= 0 && sqft <= 1_000_000) ? sqft : null,
            description: row.description ? row.description.slice(0, 5000) : null,
            status,
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
