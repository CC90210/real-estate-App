import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-logger'
import { createLeaseSchema, validateBody } from '@/lib/validations/api-schemas'
import { rateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-response'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500, prefix: 'api:leases' })

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return apiError('Unauthorized', { status: 401 })
    }

    try {
        await limiter.check(10, user.id)
    } catch {
        return apiError('Too many requests', { status: 429 })
    }

    try {
        const body = await req.json()
        const validated = validateBody(createLeaseSchema, body)
        if (!validated.success) {
            return apiError(validated.error, { status: 400, code: 'VALIDATION_ERROR' })
        }
        const { property_id, tenant_name, tenant_email, start_date, end_date, rent_amount, deposit_amount, payment_day, auto_renew, notes } = validated.data

        // Get company_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return apiError('No company found', { status: 403 })
        }

        // Verify property belongs to this company before creating lease
        if (property_id) {
            const { data: propertyCheck } = await supabase
                .from('properties')
                .select('id')
                .eq('id', property_id)
                .eq('company_id', profile.company_id)
                .maybeSingle()

            if (!propertyCheck) {
                return apiError('Property not found', { status: 404 })
            }
        }

        const { data: lease, error } = await supabase
            .from('leases')
            .insert({
                company_id: profile.company_id,
                property_id,
                tenant_name,
                tenant_email,
                start_date,
                end_date,
                rent_amount,
                deposit_amount,
                payment_day,
                auto_renew,
                notes,
                status: 'active',
                created_by: user.id,
            })
            .select('*, properties(address)')
            .single()

        if (error) {
            return apiError('Lease operation failed', { status: 500 })
        }

        try {
            await logActivity(supabase, {
                companyId: profile.company_id,
                userId: user.id,
                action: 'lease_created',
                entityType: 'lease',
                entityId: lease.id,
                description: `Created lease for ${tenant_name} at ${lease.properties?.address || 'property'}`,
            })
        } catch (logError) {
            console.error('Lease activity log failed (non-blocking):', logError)
        }

        return NextResponse.json(lease)
    } catch {
        return apiError('Lease operation failed', { status: 500 })
    }
}

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return apiError('Unauthorized', { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile?.company_id) {
        return apiError('No company found', { status: 403 })
    }

    const { data, error } = await supabase
        .from('leases')
        .select('*, properties(address, unit_number)')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(500)

    if (error) {
        return apiError('Lease operation failed', { status: 500 })
    }

    return NextResponse.json(data)
}
