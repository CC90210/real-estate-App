import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const credentialsSchema = z.object({
    singlekey_api_key: z.string().min(1).max(500).optional().nullable(),
    smtp_host: z.string().min(1).max(255).optional().nullable(),
    smtp_port: z.number().int().min(1).max(65535).optional().nullable(),
    smtp_user: z.string().email().max(255).optional().nullable(),
    smtp_password: z.string().min(8).max(500).optional().nullable(),
    from_name: z.string().max(255).optional().nullable(),
    from_email: z.string().email().max(255).optional().nullable(),
    email_provider: z.enum(['smtp', 'gmail', 'resend']).optional().nullable(),
})

export async function PUT(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.company_id) {
            return NextResponse.json({ error: 'No company found' }, { status: 403 })
        }

        if (profile.role !== 'admin') {
            return NextResponse.json({ error: 'Only company admins can update credentials' }, { status: 403 })
        }

        const body = await req.json()
        const validation = credentialsSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
        }

        const data = validation.data

        // Build update object — only include fields that were sent
        const update: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        }

        if (data.singlekey_api_key !== undefined) {
            update.singlekey_api_key = data.singlekey_api_key
        }

        if (data.email_provider !== undefined) {
            update.email_provider = data.email_provider
        }

        if (data.smtp_host !== undefined) update.smtp_host = data.smtp_host
        if (data.smtp_port !== undefined) update.smtp_port = data.smtp_port
        if (data.smtp_user !== undefined) update.smtp_user = data.smtp_user
        if (data.from_name !== undefined) update.from_name = data.from_name
        if (data.from_email !== undefined) update.from_email = data.from_email

        // SMTP password encryption — delegate to Python automation backend
        // For now, store the indicator that password was set (actual encryption
        // happens in the Python FastAPI /api/connect endpoint which uses Fernet).
        // The Next.js frontend saves non-sensitive fields; password is forwarded
        // to the automation backend separately.
        if (data.smtp_password !== undefined && data.smtp_password) {
            update.smtp_password_set = true
        }

        const { error: updateError } = await supabase
            .from('automation_settings')
            .update(update)
            .eq('company_id', profile.company_id)

        if (updateError) {
            console.error('[Credentials] Update failed:', updateError)
            return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 })
        }

        // If SMTP password was provided, forward it to the Python automation
        // backend for Fernet encryption and storage
        if (data.smtp_password) {
            try {
                const automationBaseUrl = process.env.AUTOMATION_API_URL || 'http://localhost:8000'
                await fetch(`${automationBaseUrl}/api/connect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        company_id: profile.company_id,
                        email_provider: data.email_provider || 'smtp',
                        smtp_host: data.smtp_host,
                        smtp_port: data.smtp_port,
                        smtp_user: data.smtp_user,
                        smtp_password: data.smtp_password,
                        from_name: data.from_name,
                        from_email: data.from_email,
                    }),
                })
            } catch {
                // Non-critical — SMTP password encryption is best-effort
                // The automation backend may not be running locally
                console.warn('[Credentials] Could not reach automation backend for SMTP encryption')
            }
        }

        return NextResponse.json({ success: true })

    } catch (error: unknown) {
        console.error('[Credentials] Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.company_id) {
            return NextResponse.json({ error: 'No company found' }, { status: 403 })
        }

        if (profile.role !== 'admin') {
            return NextResponse.json({ error: 'Only company admins can view credentials' }, { status: 403 })
        }

        const { data, error } = await supabase
            .from('automation_settings')
            .select('singlekey_api_key, smtp_host, smtp_port, smtp_user, from_name, from_email, email_provider')
            .eq('company_id', profile.company_id)
            .maybeSingle()

        if (error) {
            console.error('[Credentials] Fetch failed:', error)
            return NextResponse.json({ error: 'Failed to load credentials' }, { status: 500 })
        }

        // Mask ALL sensitive fields — never return full keys or server details
        const masked = data ? {
            singlekey_api_key: data.singlekey_api_key
                ? `${data.singlekey_api_key.slice(0, 8)}${'•'.repeat(20)}`
                : null,
            smtp_host: data.smtp_host
                ? `${data.smtp_host.slice(0, 5)}${'•'.repeat(15)}`
                : null,
            smtp_port: data.smtp_port,
            smtp_user: data.smtp_user
                ? `${data.smtp_user.slice(0, 3)}${'•'.repeat(10)}`
                : null,
            from_name: data.from_name,
            from_email: data.from_email,
            email_provider: data.email_provider,
            has_smtp_password: false,
        } : null

        return NextResponse.json({ data: masked })

    } catch (error: unknown) {
        console.error('[Credentials] Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
