import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: invites } = await supabase
        .from('platform_invitations')
        .select('*')
        .order('created_at', { ascending: false })

    return NextResponse.json({ invites })
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { label, companyName, assignedPlan, isEnterprise, maxUses, expiresInDays } = await req.json()

        if (!label) {
            return NextResponse.json({ error: 'Label is required' }, { status: 400 })
        }

        const { data: invite, error } = await supabase
            .from('platform_invitations')
            .insert({
                label,
                company_name: companyName || null,
                assigned_plan: isEnterprise ? 'enterprise' : (assignedPlan || 'agent_pro'),
                is_enterprise: isEnterprise || false,
                created_by: user.id,
                max_uses: maxUses || 1,
                expires_at: new Date(Date.now() + (expiresInDays || 30) * 24 * 60 * 60 * 1000).toISOString(),
            })
            .select()
            .single()

        if (error) throw error

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/platform/${invite.token}`

        return NextResponse.json({ invite, url: inviteUrl })
    } catch (error: any) {
        console.error('Create invite error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
