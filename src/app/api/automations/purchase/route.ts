import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import { isServerSuperAdmin } from '@/lib/super-admin'

const VALID_AUTOMATION_TYPES = [
    'document_delivery',
    'application_confirmation',
    'follow_up',
    'screening',
    'invoice_reminder',
    'maintenance_notification',
    'lease_renewal',
    'webhook_relay',
] as const

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return apiError('Unauthorized', { status: 401 })
        }

        const { type, name } = await request.json()

        if (!type || !name) {
            return apiError('Type and name are required', { status: 400, code: 'MISSING_FIELDS' })
        }

        if (!VALID_AUTOMATION_TYPES.includes(type)) {
            return apiError('Invalid automation type', { status: 400, code: 'INVALID_AUTOMATION_TYPE' })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, is_super_admin, is_partner, role')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return apiError('No company found', { status: 404 })
        }

        const isSuperAdmin = isServerSuperAdmin(user.email, profile.is_super_admin)

        // For Super Admins/Partners, we just activate it immediately for free
        if (isSuperAdmin || profile.is_partner) {
            const { error: upsertError } = await supabase
                .from('automation_configs')
                .upsert({
                    company_id: profile.company_id,
                    type,
                    name,
                    status: 'active',
                    purchased_at: new Date().toISOString(),
                    implementation_fee_paid: true,
                }, { onConflict: 'company_id,type' })

            if (upsertError) throw upsertError

            return NextResponse.json({ success: true, message: 'Automation activated via Admin/Partner bypass.' })
        }

        // Return a mock checkout URL for testing purposes
        return NextResponse.json({
            checkoutUrl: `/settings/billing?upgrade=${type}`
        })

    } catch (error) {
        console.error('Automation purchase error:', error)
        return apiError('Purchase failed', { status: 500 })
    }
}
