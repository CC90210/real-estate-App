import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-logger'
import { createNotification } from '@/lib/notifications'
import { createLeaseSchema, validateBody } from '@/lib/validations/api-schemas'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500 })

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        await limiter.check(10, user.id)
    } catch {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    try {
        const body = await req.json()
        const validated = validateBody(createLeaseSchema, body)
        if (!validated.success) {
            return NextResponse.json({ error: validated.error }, { status: 400 })
        }
        const { property_id, tenant_name, tenant_email, start_date, end_date, rent_amount, deposit_amount, payment_day, auto_renew, notes } = validated.data

        // Get company_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single()

        if (!profile?.company_id) {
            return NextResponse.json({ error: 'No company found' }, { status: 400 })
        }

        // Verify property belongs to this company before creating lease
        if (property_id) {
            const { data: propertyCheck } = await supabase
                .from('properties')
                .select('id')
                .eq('id', property_id)
                .eq('company_id', profile.company_id)
                .single()

            if (!propertyCheck) {
                return NextResponse.json({ error: 'Property not found' }, { status: 404 })
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
            return NextResponse.json({ error: 'Lease operation failed' }, { status: 500 })
        }

        // Log activity
        await logActivity(supabase, {
            companyId: profile.company_id,
            userId: user.id,
            action: 'lease_created',
            entityType: 'lease',
            entityId: lease.id,
            description: `Created lease for ${tenant_name} at ${lease.properties?.address || 'property'}`,
        })

        return NextResponse.json(lease)
    } catch (err) {
        return NextResponse.json({ error: 'Lease operation failed' }, { status: 500 })
    }
}

export async function GET(req: Request) {
    const supabase = await createClient()
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
        return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    const { data, error } = await supabase
        .from('leases')
        .select('*, properties(address, unit_number)')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: 'Lease operation failed' }, { status: 500 })
    }

    return NextResponse.json(data)
}
