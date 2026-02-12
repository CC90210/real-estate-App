import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification, notifyCompanyMembers } from '@/lib/notifications'

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { property_id, title, description, category, priority, photos, company_id: bodyCompanyId } = body

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, full_name, role')
            .eq('id', user.id)
            .single()

        // Use company from profile OR from body (tenants use property company)
        const companyId = profile?.company_id || bodyCompanyId

        if (!companyId) {
            return NextResponse.json({ error: 'No company context found' }, { status: 400 })
        }

        const { data: request, error } = await supabase
            .from('maintenance_requests')
            .insert({
                company_id: companyId,
                property_id,
                title,
                description,
                category: category || 'general',
                priority: priority || 'medium',
                submitted_by: user.id,
                photos: photos || [],
            })
            .select('*, properties(address)')
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Log activity
        await supabase.from('activity_log').insert({
            user_id: user.id,
            company_id: companyId,
            action: 'maintenance_created',
            entity_type: 'maintenance_request',
            entity_id: request.id,
            description: `Submitted maintenance request: ${title}`,
        })

        // Notify company members about new maintenance request
        await notifyCompanyMembers({
            companyId: companyId,
            title: `New Maintenance Request: ${title}`,
            message: `${profile?.full_name || 'A user'} submitted a ${priority} priority ${category} request for ${request.properties?.address || 'a property'}.`,
            type: priority === 'emergency' ? 'error' : 'action',
            category: 'maintenance',
            actionUrl: '/maintenance',
            actionLabel: 'View Request',
            excludeUserId: user.id,
        })

        return NextResponse.json(request)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { id, status, resolution_notes, assigned_to, scheduled_date, estimated_cost, actual_cost } = body

        const update: any = {}
        if (status) update.status = status
        if (resolution_notes) update.resolution_notes = resolution_notes
        if (assigned_to) update.assigned_to = assigned_to
        if (scheduled_date) update.scheduled_date = scheduled_date
        if (estimated_cost !== undefined) update.estimated_cost = estimated_cost
        if (actual_cost !== undefined) update.actual_cost = actual_cost
        if (status === 'completed') update.resolved_at = new Date().toISOString()

        const { data, error } = await supabase
            .from('maintenance_requests')
            .update(update)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
