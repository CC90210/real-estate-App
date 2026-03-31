import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api-response'
import { isServerSuperAdmin } from '@/lib/super-admin'

export async function GET(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Unauthorized', { status: 401 })

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .maybeSingle()

    if (!isServerSuperAdmin(user.email, profile?.is_super_admin === true)) {
        return apiError('Forbidden', { status: 403 })
    }

    const { data: invites } = await supabase
        .from('platform_invitations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

    return NextResponse.json({ invites })
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return apiError('Unauthorized', { status: 401 })

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_super_admin')
            .eq('id', user.id)
            .maybeSingle()

        if (!isServerSuperAdmin(user.email, profile?.is_super_admin === true)) {
            return apiError('Forbidden', { status: 403 })
        }

        const { label, companyName, assignedPlan, isEnterprise, maxUses, expiresInDays } = await req.json()

        if (!label) {
            return apiError('Label is required', { status: 400 })
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
    } catch (error) {
        console.error('Create invite error:', error)
        return apiError('Failed to process invite', { status: 500 })
    }
}
