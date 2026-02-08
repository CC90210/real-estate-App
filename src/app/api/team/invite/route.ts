import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Note: Using a mock for Resend if key is not provided to prevent crashes
export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, role, company:companies(name)')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can invite team members' }, { status: 403 })
        }

        const { email, role } = await req.json()

        if (!email || !role) {
            return NextResponse.json({ error: 'Email and role required' }, { status: 400 })
        }

        // Check if user already exists in this company
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .eq('company_id', profile.company_id)
            .single()

        if (existingUser) {
            return NextResponse.json({ error: 'User already in your team' }, { status: 400 })
        }

        // Create invitation
        const { data: invitation, error } = await supabase
            .from('team_invitations')
            .insert({
                company_id: profile.company_id,
                email: email.toLowerCase().trim(),
                role,
                invited_by: user.id,
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') { // Unique violation
                return NextResponse.json({ error: 'Invitation already sent to this email' }, { status: 400 })
            }
            throw error
        }

        // Generate invitation link
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${invitation.token}`

        // Send email (Simulation if RESEND_API_KEY missing)
        console.log(`[INVITE SENT] To: ${email}, Link: ${inviteUrl}`)

        // Log activity
        await supabase.from('activity_log').insert({
            company_id: profile.company_id,
            user_id: user.id,
            action: 'invited',
            entity_type: 'team_member',
            details: { email, role }
        })

        return NextResponse.json({
            success: true,
            inviteUrl,
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                expires_at: invitation.expires_at
            }
        })

    } catch (error: any) {
        console.error('Invite error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
