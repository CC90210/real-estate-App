import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Remove a team member (disassociate from company, optionally delete auth user)
export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get caller's profile to verify admin/super admin
        const { data: callerProfile } = await supabase
            .from('profiles')
            .select('id, company_id, role, is_super_admin')
            .eq('id', user.id)
            .single()

        if (!callerProfile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
        }

        if (callerProfile.role !== 'admin' && !callerProfile.is_super_admin) {
            return NextResponse.json({ error: 'Only admins can remove team members' }, { status: 403 })
        }

        const { memberId, deleteAccount } = await req.json()

        if (!memberId) {
            return NextResponse.json({ error: 'memberId is required' }, { status: 400 })
        }

        // Cannot remove yourself
        if (memberId === user.id) {
            return NextResponse.json({ error: 'Cannot remove yourself from the team' }, { status: 400 })
        }

        // Verify the target member is in the same company
        const { data: targetProfile } = await supabase
            .from('profiles')
            .select('id, company_id, email, full_name, is_super_admin')
            .eq('id', memberId)
            .single()

        if (!targetProfile) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }

        if (targetProfile.company_id !== callerProfile.company_id) {
            return NextResponse.json({ error: 'Member is not in your company' }, { status: 403 })
        }

        // Cannot remove a super admin
        if (targetProfile.is_super_admin) {
            return NextResponse.json({ error: 'Cannot remove a super admin' }, { status: 403 })
        }

        // Step 1: Always disassociate from company
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ company_id: null, role: 'agent' })
            .eq('id', memberId)

        if (updateError) {
            throw updateError
        }

        // Step 2: If deleteAccount flag is set, attempt to delete the auth user
        // Note: This requires the service_role key. If using anon key, this will fail silently.
        if (deleteAccount) {
            try {
                const { error: deleteError } = await supabase.auth.admin.deleteUser(memberId)
                if (deleteError) {
                    console.warn('[team/remove] Could not delete auth user (may need service_role):', deleteError.message)
                    // Don't fail the whole operation — profile was already unlinked
                    return NextResponse.json({
                        success: true,
                        warning: 'Member removed from company but auth account could not be deleted. Use Supabase dashboard to fully delete.',
                        memberId
                    })
                }

                // Also delete the profile row since auth user is gone
                await supabase.from('profiles').delete().eq('id', memberId)

                return NextResponse.json({
                    success: true,
                    deleted: true,
                    memberId
                })
            } catch (err: any) {
                return NextResponse.json({
                    success: true,
                    warning: 'Member removed from company. Full account deletion requires service role key.',
                    memberId
                })
            }
        }

        return NextResponse.json({
            success: true,
            memberId,
            message: 'Member removed from company'
        })

    } catch (error) {
        console.error('[team/remove] Error:', error)
        return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }
}
