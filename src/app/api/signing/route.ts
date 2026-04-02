import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { apiError, zodIssuesToDetails } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { createSigningRequestAndSendEmail } from '@/lib/signing-server'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500, prefix: 'api:signing' })

const createSigningRequestSchema = z.object({
    document_id: z.string().uuid().optional().nullable(),
    title: z.string().min(1).max(255),
    recipient_email: z.string().email(),
    recipient_name: z.string().max(255).optional().nullable(),
    message: z.string().max(2000).optional().nullable(),
    document_url: z.string().url().optional().nullable(),
    cc_email: z.string().email().optional().nullable(),
})

// GET /api/signing - List signing requests for the authenticated company
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return apiError('Unauthorized', { status: 401 })
        }

        try {
            await limiter.check(60, user.id)
        } catch {
            return apiError('Too many requests', { status: 429 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return apiError('No company associated', { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status')
        const limit = searchParams.get('limit')

        let query = supabase
            .from('signing_requests')
            .select(`
                *,
                documents (id, title, type)
            `)
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false })

        if (status) {
            query = query.eq('status', status)
        }

        if (limit) {
            const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200)
            query = query.limit(parsedLimit)
        }

        const { data, error } = await query

        if (error) {
            let fallbackQuery = supabase
                .from('signing_requests')
                .select('*')
                .eq('company_id', profile.company_id)
                .order('created_at', { ascending: false })

            if (status) {
                fallbackQuery = fallbackQuery.eq('status', status)
            }

            if (limit) {
                const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200)
                fallbackQuery = fallbackQuery.limit(parsedLimit)
            }

            const { data: fallback, error: fallbackError } = await fallbackQuery

            if (fallbackError) {
                throw fallbackError
            }

            return NextResponse.json({ success: true, signing_requests: fallback })
        }

        return NextResponse.json({ success: true, signing_requests: data })
    } catch (error) {
        console.error('[Signing GET] Error:', error)
        return apiError('Failed to fetch signing requests', { status: 500 })
    }
}

// POST /api/signing - Create a new signing request and send the signing email
export async function POST(req: NextRequest) {
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

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, full_name, email')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return apiError('No company associated', { status: 403 })
        }

        const body = await req.json()
        const validationResult = createSigningRequestSchema.safeParse(body)

        if (!validationResult.success) {
            return apiError('Validation failed', {
                status: 400,
                details: zodIssuesToDetails(validationResult.error.issues),
            })
        }

        const { document_id, title, recipient_email, recipient_name, message, document_url, cc_email } =
            validationResult.data

        const result = await createSigningRequestAndSendEmail({
            companyId: profile.company_id,
            senderId: user.id,
            senderName: profile.full_name || profile.email || user.email,
            senderEmail: profile.email || user.email,
            documentId: document_id ?? null,
            title,
            recipientEmail: recipient_email,
            recipientName: recipient_name ?? null,
            message: message ?? null,
            documentUrl: document_url || null,
            ccEmail: cc_email || null,
        })

        if (result.warning) {
            return NextResponse.json({
                success: true,
                signing_request: result.signingRequest,
                warning: result.warning,
                email_error: result.emailError,
            }, { status: 201 })
        }

        return NextResponse.json({ success: true, signing_request: result.signingRequest }, { status: 201 })
    } catch (error) {
        console.error('[Signing POST] Error:', error)
        if (error instanceof Error && error.message === 'Document not found') {
            return apiError('Document not found', { status: 404 })
        }
        return apiError('Failed to create signing request', { status: 500 })
    }
}
