import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api-response'

export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return apiError('Unauthorized', { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return apiError('Company profile not found', { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const tokenId = searchParams.get('tokenId')

        if (!tokenId) {
            return apiError('tokenId query parameter is required', { status: 400, code: 'MISSING_TOKEN_ID' })
        }

        // Verify the token belongs to this company before deleting (prevents cross-company deletion)
        const { data: tokenRecord } = await supabase
            .from('gmail_oauth_tokens')
            .select('id, company_id, is_primary')
            .eq('id', tokenId)
            .eq('company_id', profile.company_id)
            .maybeSingle()

        if (!tokenRecord) {
            return apiError('Token not found or does not belong to your company', { status: 404 })
        }

        const { error: deleteError } = await supabase
            .from('gmail_oauth_tokens')
            .delete()
            .eq('id', tokenId)
            .eq('company_id', profile.company_id)

        if (deleteError) {
            return apiError('Failed to disconnect Gmail account', { status: 500 })
        }

        // If the deleted token was the primary, promote the next available one
        if (tokenRecord.is_primary) {
            const { data: remaining } = await supabase
                .from('gmail_oauth_tokens')
                .select('id')
                .eq('company_id', profile.company_id)
                .order('created_at', { ascending: true })
                .limit(1)

            if (remaining && remaining.length > 0) {
                await supabase
                    .from('gmail_oauth_tokens')
                    .update({ is_primary: true })
                    .eq('id', remaining[0].id)
            }
        }

        return NextResponse.json({ success: true, message: 'Gmail account disconnected' })

    } catch (error: unknown) {
        console.error('[Gmail Disconnect] Error:', error instanceof Error ? error.message : error)
        return apiError('Failed to disconnect Gmail', { status: 500 })
    }
}
