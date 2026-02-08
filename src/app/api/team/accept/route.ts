import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { token, fullName, password } = await req.json()

        if (!token || !fullName || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Get invitation by token
        const { data: invitation, error: inviteError } = await supabase
            .from('team_invitations')
            .select('*, company:companies(name)')
            .eq('token', token)
            .is('accepted_at', null)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (inviteError || !invitation) {
            return NextResponse.json({
                error: 'Invalid or expired invitation'
            }, { status: 400 })
        }

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: invitation.email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    company_id: invitation.company_id,
                    role: invitation.role,
                }
            }
        })

        if (authError) throw authError

        // Create profile linked to the SAME company_id
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user!.id,
                email: invitation.email,
                full_name: fullName,
                company_id: invitation.company_id,
                role: invitation.role,
            })

        if (profileError) throw profileError

        // Mark invitation as accepted
        await supabase
            .from('team_invitations')
            .update({ accepted_at: new Date().toISOString() })
            .eq('id', invitation.id)

        // Log activity
        await supabase.from('activity_log').insert({
            company_id: invitation.company_id,
            user_id: authData.user!.id,
            action: 'joined',
            entity_type: 'team',
            details: { role: invitation.role }
        })

        return NextResponse.json({
            success: true,
            message: `Welcome to ${invitation.company?.name || 'the team'}!`
        })

    } catch (error: any) {
        console.error('Accept invitation error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
