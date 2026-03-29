import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-logger'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { canAddTeamMember } from '@/lib/plan-limits'
import { sendTeamInviteEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-response'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500 })

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
            return apiError('Unauthorized', { status: 401 })
        }

        try {
            await limiter.check(10, user.id)
        } catch {
            return apiError('Too many requests', { status: 429 })
        }

        // Get user's profile and verify admin role
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, role, company:companies!profiles_company_id_fkey(name, subscription_plan)')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return apiError('No company found', { status: 400 })
        }

        if (profile.role !== 'admin') {
            return apiError('Only admins can invite team members', { status: 403 })
        }

        // Check plan limits
        const limitCheck = await canAddTeamMember(profile.company_id)
        if (!limitCheck.allowed) {
            return apiError(limitCheck.reason || 'Team member limit reached', {
                status: 403,
                code: 'PLAN_LIMIT_REACHED',
            })
        }

        const { email, role } = await req.json()

        if (!email || !role) {
            return apiError('Email and role are required', { status: 400 })
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return apiError('Invalid email format', { status: 400 })
        }

        // Validate role
        if (!['admin', 'agent', 'landlord'].includes(role)) {
            return apiError('Invalid role', { status: 400 })
        }

        const normalizedEmail = email.toLowerCase().trim()

        // Check if user is already a member of this company
        const { data: existingMember } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('company_id', profile.company_id)
            .eq('email', normalizedEmail)
            .maybeSingle()

        if (existingMember) {
            return apiError('User is already a team member', { status: 400 })
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
            return apiError('Failed to create invitation', { status: 500 })
        }

        // Generate invitation link
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${invitation.token}`

        // Log activity
        try {
            await logActivity(supabase, {
                companyId: profile.company_id,
                userId: user.id,
                action: 'invited',
                entityType: 'team_member',
                description: `Invited ${normalizedEmail} to the team as ${role}`,
                details: { email: normalizedEmail, role },
            })
        } catch {
            // Non-critical
        }

        // Send invitation email
        const companyData = profile.company as any
        const inviterProfile = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle()

        await sendTeamInviteEmail({
            email: normalizedEmail,
            inviterName: inviterProfile.data?.full_name || user.email || 'A colleague',
            companyName: companyData?.name || 'Your company',
            role,
            inviteUrl,
        })

        console.log('[Invite] Invitation created successfully')

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

    } catch (error) {
        console.error('Invite error:', error)
        return apiError('Failed to send invite', { status: 500 })
    }
}

// GET - List invitations for company
export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return apiError('Unauthorized', { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, role')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id || profile.role !== 'admin') {
            return apiError('Unauthorized', { status: 403 })
        }

        const { data: invitations } = await supabaseAdmin
            .from('team_invitations')
            .select('id, email, role, status, expires_at, created_at, accepted_at, token')
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false })

        return NextResponse.json({ invitations: invitations || [] })

    } catch (error) {
        return apiError('Failed to fetch invitations', { status: 500 })
    }
}

// DELETE - Revoke invitation
export async function DELETE(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return apiError('Unauthorized', { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const invitationId = searchParams.get('id')

        if (!invitationId) {
            return apiError('Invitation ID required', { status: 400 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, role')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id || profile.role !== 'admin') {
            return apiError('Unauthorized', { status: 403 })
        }

        const { error } = await supabaseAdmin
            .from('team_invitations')
            .update({ status: 'revoked' })
            .eq('id', invitationId)
            .eq('company_id', profile.company_id)
            .eq('status', 'pending')

        if (error) {
            return apiError('Failed to revoke invitation', { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        return apiError('Failed to revoke invite', { status: 500 })
    }
}
