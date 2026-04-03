import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import { isServerSuperAdmin } from '@/lib/super-admin'
import { resolveCompanyPlan } from '@/lib/plans/resolve'

const VALID_AUTOMATION_TYPES = [
    'document_sender',
    'invoice_sender',
    'application_processor',
    'follow_up',
    'listing_poster',
    'email_agent',
    'voice_agent',
    'review_agent',
    'webhook_relay',
] as const

const PLAN_INCLUDED_AUTOMATIONS = new Set<string>([
    'document_sender',
    'invoice_sender',
])

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
            .select('company_id, is_super_admin, is_partner, role, companies(subscription_plan, subscription_status, plan_override, is_lifetime_access)')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return apiError('No company found', { status: 404 })
        }

        const isSuperAdmin = isServerSuperAdmin(user.email, profile.is_super_admin)
        const companies = profile.companies as unknown as Array<{
            subscription_plan?: string | null
            subscription_status?: string | null
            plan_override?: string | null
            is_lifetime_access?: boolean | null
        }> | null
        const company = Array.isArray(companies) ? companies[0] ?? null : null

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

        if (profile.role !== 'admin') {
            return apiError('Only company admins can provision automations', {
                status: 403,
                code: 'ADMIN_REQUIRED',
            })
        }

        if (company && PLAN_INCLUDED_AUTOMATIONS.has(type)) {
            const planInfo = resolveCompanyPlan(company)

            if (planInfo.effectivePlan.limits.automations) {
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

                return NextResponse.json({
                    success: true,
                    message: `${name} activated for your current plan.`,
                })
            }
        }

        return NextResponse.json({
            success: true,
            checkoutUrl: `/settings/billing?automation=${type}`,
            message: 'Continue in billing to provision this automation for your company.',
        })

    } catch (error) {
        console.error('Automation purchase error:', error)
        return apiError('Purchase failed', { status: 500 })
    }
}
