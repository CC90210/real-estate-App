import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiError, zodIssuesToDetails } from '@/lib/api-response'
import { createClient } from '@/lib/supabase/server'

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
            return apiError('Not authenticated', { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, role')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return apiError('No company found', { status: 403 })
        }

        if (profile.role !== 'admin') {
            return apiError('Only company admins can update credentials', { status: 403 })
        }

        const body = await req.json()
        const validation = credentialsSchema.safeParse(body)

        if (!validation.success) {
            return apiError('Invalid payload', {
                status: 400,
                code: 'VALIDATION_ERROR',
                details: zodIssuesToDetails(validation.error.issues),
            })
        }

        const data = validation.data
        const emailProvider = data.email_provider ?? 'smtp'

        if (data.smtp_password) {
            const requiredFields = ['smtp_host', 'smtp_user', 'from_name', 'from_email'] as const
            const missingFields = requiredFields.filter((field) => !data[field])

            if (missingFields.length > 0) {
                return apiError('SMTP password updates require a complete SMTP configuration', {
                    status: 400,
                    code: 'INCOMPLETE_SMTP_CONFIG',
                    details: missingFields.map((field) => ({
                        field,
                        message: `${field} is required when smtp_password is provided`,
                        code: 'missing_field',
                    })),
                })
            }

            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) {
                return apiError('Unable to verify credentials update session', {
                    status: 401,
                    code: 'MISSING_SESSION_TOKEN',
                })
            }

            const automationBaseUrl = process.env.AUTOMATION_API_URL || 'http://localhost:8001'
            const automationResponse = await fetch(`${automationBaseUrl}/api/connect`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    credentials: {
                        company_id: profile.company_id,
                        email_provider: emailProvider,
                        smtp_host: data.smtp_host,
                        smtp_port: data.smtp_port ?? 587,
                        smtp_user: data.smtp_user,
                        smtp_password: data.smtp_password,
                        from_name: data.from_name,
                        from_email: data.from_email,
                    },
                }),
            })

            if (!automationResponse.ok) {
                let upstreamMessage = 'Failed to save SMTP credentials securely'

                try {
                    const upstreamBody = await automationResponse.json()
                    if (typeof upstreamBody?.detail === 'string' && upstreamBody.detail) {
                        upstreamMessage = upstreamBody.detail
                    } else if (typeof upstreamBody?.error === 'string' && upstreamBody.error) {
                        upstreamMessage = upstreamBody.error
                    }
                } catch {
                    // Fall back to the generic error above.
                }

                return apiError(upstreamMessage, {
                    status: automationResponse.status >= 400 && automationResponse.status < 600
                        ? automationResponse.status
                        : 502,
                    code: 'AUTOMATION_BACKEND_ERROR',
                })
            }
        }

        const update: Record<string, unknown> = {
            company_id: profile.company_id,
            updated_by: user.id,
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

        const { error: updateError } = await supabase
            .from('automation_settings')
            .upsert(update, { onConflict: 'company_id' })

        if (updateError) {
            console.error('[Credentials] Update failed:', updateError)
            return apiError('Failed to save credentials', { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        console.error('[Credentials] Unexpected error:', error)
        return apiError('Internal server error', { status: 500 })
    }
}

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return apiError('Not authenticated', { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, role')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return apiError('No company found', { status: 403 })
        }

        if (profile.role !== 'admin') {
            return apiError('Only company admins can view credentials', { status: 403 })
        }

        const { data, error } = await supabase
            .from('automation_settings')
            .select('singlekey_api_key, smtp_host, smtp_port, smtp_user, from_name, from_email, email_provider, platform_credentials')
            .eq('company_id', profile.company_id)
            .maybeSingle()

        if (error) {
            console.error('[Credentials] Fetch failed:', error)
            return apiError('Failed to load credentials', { status: 500 })
        }

        const platformCreds = data?.platform_credentials as Record<string, Record<string, string>> | null

        const masked = data ? {
            singlekey_api_key: data.singlekey_api_key
                ? `${data.singlekey_api_key.slice(0, 8)}${'*'.repeat(20)}`
                : null,
            smtp_host: data.smtp_host
                ? `${data.smtp_host.slice(0, 5)}${'*'.repeat(15)}`
                : null,
            smtp_port: data.smtp_port,
            smtp_user: data.smtp_user
                ? `${data.smtp_user.slice(0, 3)}${'*'.repeat(10)}`
                : null,
            from_name: data.from_name,
            from_email: data.from_email,
            email_provider: data.email_provider,
            has_smtp_password: false,
            has_facebook_marketplace: !!(platformCreds?.facebook_marketplace?.access_token),
        } : null

        return NextResponse.json({ data: masked })
    } catch (error: unknown) {
        console.error('[Credentials] Unexpected error:', error)
        return apiError('Internal server error', { status: 500 })
    }
}
