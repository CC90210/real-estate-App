import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { property_id, tenant_name, tenant_email, start_date, end_date, rent_amount, deposit_amount, payment_day, auto_renew, notes } = body

        // Get company_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single()

        if (!profile?.company_id) {
            return NextResponse.json({ error: 'No company found' }, { status: 400 })
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
                rent_amount: parseFloat(rent_amount),
                deposit_amount: parseFloat(deposit_amount || '0'),
                payment_day: parseInt(payment_day || '1'),
                auto_renew: auto_renew || false,
                notes,
                status: 'active',
                created_by: user.id,
            })
            .select('*, properties(address)')
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Log activity
        await supabase.from('activity_log').insert({
            user_id: user.id,
            company_id: profile.company_id,
            action: 'lease_created',
            entity_type: 'lease',
            entity_id: lease.id,
            description: `Created lease for ${tenant_name} at ${lease.properties?.address || 'property'}`,
        })

        return NextResponse.json(lease)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
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
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}
