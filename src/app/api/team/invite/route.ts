import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { canAddTeamMember } from '@/lib/plan-limits'

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Create a new invitation
export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's profile and verify admin role
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, role, company:companies(name, subscription_plan)')
            .eq('id', user.id)
            .single()

        if (!profile?.company_id) {
            return NextResponse.json({ error: 'No company found' }, { status: 400 })
        }

        if (profile.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can invite team members' }, { status: 403 })
        }

        // Check plan limits
        const limitCheck = await canAddTeamMember(profile.company_id)
        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: limitCheck.reason,
                code: 'PLAN_LIMIT_REACHED',
                currentUsage: limitCheck.currentUsage,
                limit: limitCheck.limit,
            }, { status: 403 })
        }

        const { email, role } = await req.json()

        if (!email || !role) {
            return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
        }

        // Validate role
        if (!['admin', 'agent', 'landlord'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }

        const normalizedEmail = email.toLowerCase().trim()

        // Check if user is already a member of this company
        const { data: existingMember } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('company_id', profile.company_id)
            .eq('email', normalizedEmail)
            .single()

        if (existingMember) {
            return NextResponse.json({ error: 'User is already a team member' }, { status: 400 })
        }

        // Revoke any existing pending invitations for this email + company
        // This prevents the duplicate constraint error on re-invite
        await supabaseAdmin
            .from('team_invitations')
            .update({ status: 'revoked' })
            .eq('company_id', profile.company_id)
            .eq('email', normalizedEmail)
            .eq('status', 'pending')

        // Create new invitation using admin client (bypasses RLS)
        const { data: invitation, error: inviteError } = await supabaseAdmin
            .from('team_invitations')
            .insert({
                company_id: profile.company_id,
                email: normalizedEmail,
                role,
                invited_by: user.id,
                status: 'pending',
            })
            .select()
            .single()

        if (inviteError) {
            console.error('Invitation error:', inviteError)
            return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
        }

        // Generate invitation link
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${invitation.token}`

        // Log activity
        try {
            await supabase.from('activity_log').insert({
                company_id: profile.company_id,
                user_id: user.id,
                action: 'invited',
                entity_type: 'team_member',
                details: { email: normalizedEmail, role },
            })
        } catch {
            // Non-critical
        }

        // Log for debugging (email sending can be added later)
        console.log(`[INVITE SENT] To: ${normalizedEmail}, Link: ${inviteUrl}`)

        return NextResponse.json({
            success: true,
            inviteUrl,
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                expires_at: invitation.expires_at,
            },
        })

    } catch (error: any) {
        console.error('Invite error:', error)
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
    }
}

// GET - List invitations for company
export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.company_id || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const { data: invitations } = await supabaseAdmin
            .from('team_invitations')
            .select('id, email, role, status, expires_at, created_at, accepted_at, token')
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false })

        return NextResponse.json({ invitations: invitations || [] })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE - Revoke invitation
export async function DELETE(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const invitationId = searchParams.get('id')

        if (!invitationId) {
            return NextResponse.json({ error: 'Invitation ID required' }, { status: 400 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.company_id || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const { error } = await supabaseAdmin
            .from('team_invitations')
            .update({ status: 'revoked' })
            .eq('id', invitationId)
            .eq('company_id', profile.company_id)
            .eq('status', 'pending')

        if (error) {
            return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
