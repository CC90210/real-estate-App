import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(req: Request) {
    const supabase = await createClient() // await is needed for server client sometimes in newer versions or if it's async
    const { actionType, entityType, entityId, additionalData } = await req.json()

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
        return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    // Check if company has automations enabled
    const { data: subscription } = await supabase
        .from('automation_subscriptions')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .single()

    // For Development/Demo, if no subscription exists, let's allow it or mock it? 
    // The prompt says: "If no automation subscription, show upgrade prompt".
    // But for the backend, we should enforce it. 
    // However, if the user hasn't inserted "automation_subscriptions" yet, this will block them.
    // Let's assume the SQL migration was run and they might need to insert a row manually or we auto-create.
    // To implement the "Upsell", we strictly return 403 if not active.

    if (!subscription) {
        return NextResponse.json(
            { error: 'Automations not enabled for this account' },
            { status: 403 }
        )
    }

    // Get the entity data
    let entityData = null
    if (entityType === 'property' && entityId) {
        const { data } = await supabase
            .from('properties')
            .select('*, buildings(*), landlords(*)') // Adjusted relationships
            .eq('id', entityId)
            .single()
        entityData = data
    } else if (entityType === 'application' && entityId) {
        const { data } = await supabase
            .from('applications')
            .select('*, properties(*)') // Adjusted relationships
            .eq('id', entityId)
            .single()
        entityData = data
    }

    // Get company info for branding
    const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single()

    // Build the payload
    const payload = {
        id: `auto_${crypto.randomUUID()}`,
        action: actionType,
        company: {
            id: company.id,
            name: company.name,
            logo_url: company.logo_url,
            // email/phone might not be on companies table based on schema, providing safely
            email: company.email || 'no-reply@propflow.app',
            phone: company.phone || ''
        },
        entity: {
            type: entityType,
            id: entityId,
            data: entityData
        },
        user: {
            id: user.id,
            email: user.email
        },
        additional: additionalData,
        triggered_at: new Date().toISOString()
    }

    // Log the automation
    const { data: logEntry, error: logError } = await supabase
        .from('automation_logs')
        .insert({
            company_id: profile.company_id,
            user_id: user.id,
            action_type: actionType,
            entity_type: entityType,
            entity_id: entityId,
            payload,
            status: 'pending'
        })
        .select()
        .single()

    if (logError) {
        return NextResponse.json({ error: 'Failed to log automation', details: logError.message }, { status: 500 })
    }

    // Send to n8n
    const n8nBaseUrl = process.env.N8N_BASE_URL
    const n8nWebhookSecret = process.env.N8N_WEBHOOK_SECRET

    if (!n8nBaseUrl || !n8nWebhookSecret) {
        // Fallback for demo: just simulate success
        await supabase.from('automation_logs').update({ status: 'completed', result: { demo: true } }).eq('id', logEntry.id)
        return NextResponse.json({ success: true, logId: logEntry.id, message: 'Automation (Demo) triggered' })
    }

    const n8nUrl = n8nBaseUrl + '/webhook/propflow-automation'

    const signature = crypto
        .createHmac('sha256', n8nWebhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex')

    try {
        const response = await fetch(n8nUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-PropFlow-Signature': signature,
                'X-PropFlow-Log-Id': logEntry.id
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            throw new Error(`n8n responded with ${response.status}`)
        }

        // Update log status
        await supabase
            .from('automation_logs')
            .update({ status: 'processing' })
            .eq('id', logEntry.id)

        return NextResponse.json({
            success: true,
            logId: logEntry.id,
            message: 'Automation triggered successfully'
        })

    } catch (error: any) {
        // Update log with error
        await supabase
            .from('automation_logs')
            .update({
                status: 'failed',
                error_message: error.message
            })
            .eq('id', logEntry.id)

        return NextResponse.json(
            { error: 'Failed to trigger automation', details: error.message },
            { status: 500 }
        )
    }
}
