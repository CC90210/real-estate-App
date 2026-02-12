import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const token = searchParams.get('token')

        if (!token) {
            return NextResponse.json({ error: 'Token required' }, { status: 400 })
        }

        // Fetch invitation with company details using admin client
        const { data: invitation, error } = await supabaseAdmin
            .from('team_invitations')
            .select(`
                id,
                email,
                role,
                status,
                expires_at,
                company:companies(
                    id,
                    name,
                    logo_url
                )
            `)
            .eq('token', token)
            .single()

        if (error || !invitation) {
            return NextResponse.json({
                valid: false,
                error: 'Invitation not found'
            }, { status: 404 })
        }

        // Check if expired
        if (new Date(invitation.expires_at) < new Date()) {
            // Auto-expire
            await supabaseAdmin
                .from('team_invitations')
                .update({ status: 'expired' })
                .eq('id', invitation.id)

            return NextResponse.json({
                valid: false,
                error: 'This invitation has expired. Please request a new one.'
            }, { status: 400 })
        }

        // Check status
        if (invitation.status !== 'pending') {
            return NextResponse.json({
                valid: false,
                error: `This invitation has already been ${invitation.status}`
            }, { status: 400 })
        }

        return NextResponse.json({
            valid: true,
            invitation: {
                email: invitation.email,
                role: invitation.role,
                company: invitation.company,
            },
        })

    } catch (error: any) {
        console.error('Validate invitation error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
