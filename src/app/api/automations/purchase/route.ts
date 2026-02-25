import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { type, name } = await request.json()

        if (!type || !name) {
            return NextResponse.json({ error: 'Type and name are required' }, { status: 400 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, is_super_admin, is_partner, role')
            .eq('id', user.id)
            .single()

        if (!profile?.company_id) {
            return NextResponse.json({ error: 'No company found' }, { status: 404 })
        }

        const isSuperAdmin = profile.is_super_admin || profile.role === 'super_admin';

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

    } catch (error: any) {
        console.error('Automation purchase error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
