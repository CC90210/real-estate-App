import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-logger'
import Papa from 'papaparse'
import { rateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-response'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500 })

export async function POST(req: Request) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return apiError('Unauthorized', { status: 401 })
    }

    try {
        await limiter.check(3, user.id)
    } catch {
        return apiError('Too many import requests', { status: 429 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile?.company_id) {
        return apiError('No company', { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
        return apiError('No file provided', { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
        return apiError('File too large. Maximum 5 MB.', { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
        return apiError('Only CSV files are accepted', { status: 400 })
    }

    const text = await file.text()

    const { data: rows, errors } = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().trim().replace(/\s+/g, '_')
    })

    if (errors.length > 0) {
        return apiError('CSV parsing failed. Please check the file format.', { status: 400 })
    }

    if (rows.length > 5000) {
        return apiError(`CSV too large (${rows.length} rows). Maximum 5,000 properties per import.`, { status: 400 })
    }

    const properties: Record<string, any>[] = []
    const validationErrors: { row: number; error: string }[] = []

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as any

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
        return apiError('No valid properties found', {
            status: 400,
            details: validationErrors.map(({ row, error }) => ({
                field: `row.${row}`,
                message: error,
                code: 'invalid',
            })),
        })
    }

    const { data: inserted, error: insertError } = await supabase
        .from('properties')
        .insert(properties)
        .select()

    if (insertError) {
        console.error('[Import] Insert failed:', insertError)
        return apiError('Failed to import properties. Please check your CSV format and try again.', { status: 500 })
    }

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
