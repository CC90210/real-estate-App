import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiError, zodIssuesToDetails } from '@/lib/api-response'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
    facebook_marketplace: z.object({
        access_token: z.string().min(1).max(1000),
        page_id: z.string().min(1).max(100),
    }),
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
        const validation = bodySchema.safeParse(body)

        if (!validation.success) {
            return apiError('Invalid payload', {
                status: 400,
                code: 'VALIDATION_ERROR',
                details: zodIssuesToDetails(validation.error.issues),
            })
        }

        const { facebook_marketplace } = validation.data

        // Read existing platform_credentials to merge (not overwrite other platforms)
        const { data: existing } = await supabase
            .from('automation_settings')
            .select('platform_credentials')
            .eq('company_id', profile.company_id)
            .maybeSingle()

        const currentCredentials = (existing?.platform_credentials as Record<string, unknown>) ?? {}

        const updatedCredentials = {
            ...currentCredentials,
            facebook_marketplace: {
                access_token: facebook_marketplace.access_token,
                page_id: facebook_marketplace.page_id,
            },
        }

        const { error: updateError } = await supabase
            .from('automation_settings')
            .upsert(
                {
                    company_id: profile.company_id,
                    platform_credentials: updatedCredentials,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'company_id' }
            )

        if (updateError) {
            return apiError('Failed to save marketplace credentials', { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        return apiError('Internal server error', { status: 500 })
    }
}
