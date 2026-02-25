import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request, props: { params: Promise<{ companyId: string }> }) {
    const params = await props.params;
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // CRITICAL: Verify super_admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { plan, reason } = await req.json()

        // Validate plan value
        const validPlans = ['enterprise', 'brokerage_command', 'agency_growth', 'agent_pro', null]
        if (!validPlans.includes(plan)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
        }

        // Update company
        const updateData: any = {
            plan_override: plan,
            plan_override_reason: reason || null,
            plan_override_by: user.id,
            plan_override_at: plan ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
        }

        // If setting enterprise, also set subscription_status to active
        if (plan === 'enterprise') {
            updateData.subscription_status = 'active'
        }

        const { error } = await supabase
            .from('companies')
            .update(updateData)
            .eq('id', params.companyId)

        if (error) throw error

        return NextResponse.json({ success: true, plan })
    } catch (error: any) {
        console.error('Plan override error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
