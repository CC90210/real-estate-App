import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logActivity } from '@/lib/services/activity-logger'

// MUST use admin client for creating users - this was the critical bug
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
)

export async function POST(req: Request) {
    try {
        const { token, password, fullName } = await req.json()

        if (!token || !password || !fullName) {
            return NextResponse.json({
                error: 'Token, password, and full name are required'
            }, { status: 400 })
        }

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json({
                error: 'Password must be at least 8 characters'
            }, { status: 400 })
        }

        // 1. Fetch and validate the invitation using admin client (bypasses RLS)
        const { data: invitation, error: inviteError } = await supabaseAdmin
            .from('team_invitations')
            .select(`
                id,
                email,
                role,
                status,
                expires_at,
                company_id,
                company:companies(
                    id,
                    name
                )
            `)
            .eq('token', token)
            .single()

        if (inviteError || !invitation) {
            console.error('Invitation lookup error:', inviteError)
            return NextResponse.json({
                error: 'Invalid invitation token'
            }, { status: 400 })
        }

        // 2. Verify invitation is still valid
        if (invitation.status !== 'pending') {
            return NextResponse.json({
                error: `This invitation has already been ${invitation.status}`
            }, { status: 400 })
        }

        if (new Date(invitation.expires_at) < new Date()) {
            // Auto-expire the invitation
            await supabaseAdmin
                .from('team_invitations')
                .update({ status: 'expired' })
                .eq('id', invitation.id)

            return NextResponse.json({
                error: 'This invitation has expired. Please request a new one.'
            }, { status: 400 })
        }

        // 3. Check if email already has an account
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(
            u => u.email?.toLowerCase() === invitation.email.toLowerCase()
        )

        let userId: string

        if (existingUser) {
            // User already exists in auth - just link them to the company
            userId = existingUser.id

            // Check if they already have a profile for this company
            const { data: existingProfile } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('id', userId)
                .eq('company_id', invitation.company_id)
                .single()

            if (existingProfile) {
                return NextResponse.json({
                    error: 'You are already a member of this company'
                }, { status: 400 })
            }
        } else {
            // 4. CREATE THE USER IN SUPABASE AUTH using admin API
            // This is THE critical fix - using admin.createUser instead of auth.signUp
            // admin.createUser:
            //   - Bypasses email confirmation requirement
            //   - Creates the user immediately and reliably
            //   - Returns a confirmed user that can log in right away
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: invitation.email,
                password: password,
                email_confirm: true, // Auto-confirm since they have a valid invite token
                user_metadata: {
                    full_name: fullName,
                    invited_to_company: invitation.company_id,
                },
            })

            if (authError || !authData.user) {
                console.error('Auth user creation error:', authError)
                return NextResponse.json({
                    error: authError?.message || 'Failed to create account'
                }, { status: 500 })
            }

            userId = authData.user.id
            console.log('Created auth user:', userId, 'for email:', invitation.email)
        }

        // 5. CREATE/UPSERT THE PROFILE (linked to company)
        // Using admin client to bypass RLS policies
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                email: invitation.email.toLowerCase(),
                full_name: fullName,
                company_id: invitation.company_id,
                role: invitation.role,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'id',
            })

        if (profileError) {
            console.error('Profile creation error:', profileError)
            return NextResponse.json({
                error: 'Failed to create user profile. Please contact support.'
            }, { status: 500 })
        }

        console.log('Created/updated profile for user:', userId, 'in company:', invitation.company_id)

        // 6. MARK INVITATION AS ACCEPTED
        const { error: updateError } = await supabaseAdmin
            .from('team_invitations')
            .update({
                status: 'accepted',
                accepted_at: new Date().toISOString(),
                accepted_by: userId,
            })
            .eq('id', invitation.id)

        if (updateError) {
            console.error('Invitation update error:', updateError)
            // Non-critical - user is created, they can log in
        }

        // 7. Log activity
        try {
            await logActivity(supabaseAdmin, {
                companyId: invitation.company_id,
                userId: userId,
                action: 'joined',
                entityType: 'team',
                description: `${fullName} joined the team as ${invitation.role}`,
                details: { role: invitation.role },
            })
        } catch {
            // Non-critical
        }

        // 8. Return success
        const companyData = invitation.company as any
        return NextResponse.json({
            success: true,
            message: `Welcome to ${companyData?.name || 'the team'}! You can now sign in.`,
            user: {
                id: userId,
                email: invitation.email,
                role: invitation.role,
                company: companyData?.name,
            },
        })

    } catch (error: any) {
        console.error('Accept invitation error:', error)
        return NextResponse.json({
            error: error.message || 'Failed to accept invitation'
        }, { status: 500 })
    }
}
