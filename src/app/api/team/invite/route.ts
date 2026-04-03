import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-logger'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { canAddTeamMember } from '@/lib/plan-limits'
import { loadCompanyBranding } from '@/lib/email'
import { sendPlatformEmail } from '@/lib/email-server'
import { rateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-response'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500, prefix: 'api:team-invite' })

type CompanyInviteSummary = {
    name?: string | null
    subscription_plan?: string | null
}

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
        const companyData = Array.isArray(profile.company)
            ? profile.company[0]
            : profile.company as CompanyInviteSummary | null | undefined
        const inviterProfile = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle()

        const branding = await loadCompanyBranding(profile.company_id)

        const inviterName = inviterProfile.data?.full_name || user.email || 'A colleague'
        const companyName = companyData?.name || 'Your company'
        const accent = branding.primary_color || '#3b82f6'
        const logoHtml = branding.logo_url
            ? `<img src="${branding.logo_url}" alt="${companyName}" style="max-height:48px;max-width:200px;margin:0 auto 8px;display:block;" />`
            : ''

        const emailResult = await sendPlatformEmail({
            to: normalizedEmail,
            subject: `${inviterName} invited you to join ${companyName}`,
            html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
                body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f8fafc;color:#1e293b}
                .c{max-width:600px;margin:0 auto;padding:40px 20px}.card{background:#fff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
                .logo{text-align:center;margin-bottom:32px}h2{font-size:22px;font-weight:800;margin:0 0 16px}p{font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px}
                .btn{display:inline-block;padding:14px 32px;background:${accent};color:#fff!important;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px}
                .footer{text-align:center;margin-top:32px;font-size:12px;color:#94a3b8}
            </style></head><body><div class="c"><div class="card">
                <div class="logo">${logoHtml}<h1 style="font-size:24px;font-weight:900;margin:0">${companyName}</h1><p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:${accent};margin:4px 0 0">Powered by PropFlow</p></div>
                <h2>You're Invited!</h2>
                <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> as a <strong>${role}</strong>.</p>
                <p>Click the button below to create your account and get started:</p>
                <div style="text-align:center;margin:32px 0"><a href="${inviteUrl}" class="btn">Accept Invitation</a></div>
                <p style="font-size:13px;color:#94a3b8">This invitation expires in 7 days.</p>
            </div><div class="footer"><p>&copy; ${new Date().getFullYear()} ${companyName}. Powered by PropFlow.</p></div></div></body></html>`,
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
            ...(emailResult.success ? {} : {
                warning: 'Invitation created, but email delivery failed. Share the invite link manually if needed.',
                email_error: emailResult.error,
            }),
        }, { status: 201 })

    } catch (error) {
        console.error('Invite error:', error)
        return apiError('Failed to send invite', { status: 500 })
    }
}

// GET - List invitations for company
export async function GET() {
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

    } catch {
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

    } catch {
        return apiError('Failed to revoke invite', { status: 500 })
    }
}
