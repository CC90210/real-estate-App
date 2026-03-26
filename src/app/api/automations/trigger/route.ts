import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeAutomation, type AutomationEvent, type AutomationPayload } from '@/lib/automations/engine'
import { rateLimit } from '@/lib/rate-limit'
import { logAuditEvent } from '@/lib/audit-log'
import { triggerAutomationSchema, validateBody } from '@/lib/validations/api-schemas'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500 })

export async function POST(req: Request) {
    try {
        // Rate limiting
        const ip = req.headers.get('x-forwarded-for') || 'anonymous'
        try {
            await limiter.check(30, ip)
        } catch {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            )
        }

        const supabase = await createClient()
        const body = await req.json()

        // Validate input schema
        const validated = validateBody(triggerAutomationSchema, body)
        if (!validated.success) {
            return NextResponse.json({ error: validated.error }, { status: 400 })
        }

        // Support both the old format (actionType/entityType) and new format (event_type/payload)
        const eventType = validated.data.event_type || validated.data.actionType || validated.data.event
        const payload = validated.data.payload || body

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

        // Ensure company_id is set and matches the user's company (prevent cross-tenant)
        const automationPayload: AutomationPayload = {
            ...payload,
            company_id: profile.company_id,
        }

        // Log the automation attempt
        const { data: logEntry } = await supabase
            .from('automation_logs')
            .insert({
                company_id: profile.company_id,
                user_id: user.id,
                action_type: eventType,
                payload: automationPayload,
                status: 'processing',
            })
            .select('id')
            .maybeSingle()

        // Execute the automation inline
        const result = await executeAutomation(eventType as AutomationEvent, automationPayload)

        // Update log status
        if (logEntry?.id) {
            await supabase
                .from('automation_logs')
                .update({ status: result.success ? 'completed' : 'failed' })
                .eq('id', logEntry.id)
        }

        // Audit log
        await logAuditEvent({
            action: 'api_access',
            userId: user.id,
            companyId: profile.company_id,
            resourceType: 'automation',
            resourceId: logEntry?.id || 'unknown',
            metadata: { eventType, success: result.success },
            ipAddress: ip,
        })

        return NextResponse.json({
            success: result.success,
            logId: logEntry?.id,
            message: result.message,
            automation_type: result.automation_type,
        })

    } catch (error: unknown) {
        console.error('Automation Trigger Error:', error)
        return NextResponse.json(
            { error: 'Failed to trigger automation' },
            { status: 500 }
        )
    }
}
