
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dispatchDocumentWebhook } from '@/lib/webhooks/dispatcher'

export async function POST(req: Request) {
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

        if (!profile?.company_id) {
            return NextResponse.json({ error: 'No company found' }, { status: 400 })
        }

        const body = await req.json()
        const { documentType, documentId, dispatchNotes } = body

        if (!documentType || !documentId) {
            return NextResponse.json({
                error: 'documentType and documentId are required'
            }, { status: 400 })
        }

        // Dispatch the webhook
        const result = await dispatchDocumentWebhook(
            profile.company_id,
            documentType,
            documentId,
            dispatchNotes
        )

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
            }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: 'Document dispatched successfully',
            webhookId: result.webhookId,
        })

    } catch (error: any) {
        console.error('Dispatch API error:', error)
        return NextResponse.json({
            error: error.message || 'Dispatch failed'
        }, { status: 500 })
    }
}
