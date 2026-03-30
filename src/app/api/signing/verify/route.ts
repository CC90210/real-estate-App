import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { apiError, zodIssuesToDetails } from '@/lib/api-response';
import { rateLimit } from '@/lib/rate-limit';
import { loadCompanyBranding } from '@/lib/email';

// Stricter rate limit for the unauthenticated verify endpoint
const getLimiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500, prefix: 'api:signing:verify:get' });
const postLimiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 200, prefix: 'api:signing:verify:post' });

const submitSignatureSchema = z.object({
    token: z.string().min(1),
    typed_name: z.string().min(1).max(255),
});

/**
 * GET /api/signing/verify?token=xxx
 *
 * Public endpoint — no auth required.
 * Returns document info for the signing page and records the first view.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return apiError('Token is required', { status: 400 });
        }

        // Rate limit by token to prevent enumeration
        try {
            await getLimiter.check(20, token);
        } catch {
            return apiError('Too many requests', { status: 429 });
        }

        const db = getSupabaseAdmin();

        const { data: signingRequest, error } = await db
            .from('signing_requests')
            .select('id, title, recipient_name, recipient_email, document_url, status, expires_at, viewed_at, company_id, message')
            .eq('signing_token', token)
            .maybeSingle();

        if (error) throw error;

        if (!signingRequest) {
            return apiError('Invalid or expired signing link', { status: 404 });
        }

        if (signingRequest.status === 'cancelled') {
            return apiError('This signing request has been cancelled', { status: 410 });
        }

        if (signingRequest.status === 'signed') {
            // Return info but flag as already completed — signing page can render accordingly
            return NextResponse.json({
                success: true,
                already_signed: true,
                signing_request: {
                    title: signingRequest.title,
                    recipient_name: signingRequest.recipient_name,
                    status: signingRequest.status,
                },
            });
        }

        if (signingRequest.expires_at && new Date(signingRequest.expires_at) < new Date()) {
            // Mark expired in DB
            await db
                .from('signing_requests')
                .update({ status: 'expired' })
                .eq('id', signingRequest.id);

            return apiError('This signing link has expired', { status: 410 });
        }

        // Load company branding for the signing page
        const branding = await loadCompanyBranding(signingRequest.company_id);

        // Record first view
        if (!signingRequest.viewed_at) {
            const ip = getClientIp(req);
            const userAgent = req.headers.get('user-agent') || null;

            await db
                .from('signing_requests')
                .update({ viewed_at: new Date().toISOString(), status: 'viewed' })
                .eq('id', signingRequest.id);

            await db.from('signing_audit_log').insert({
                signing_request_id: signingRequest.id,
                action: 'viewed',
                actor_email: signingRequest.recipient_email,
                ip_address: ip,
                user_agent: userAgent,
                metadata: { first_view: true },
            });
        }

        return NextResponse.json({
            success: true,
            signing_request: {
                title: signingRequest.title,
                recipient_name: signingRequest.recipient_name,
                document_url: signingRequest.document_url,
                status: signingRequest.status,
                message: signingRequest.message,
                expires_at: signingRequest.expires_at,
            },
            branding: {
                name: branding.name,
                logo_url: branding.logo_url ?? null,
                primary_color: branding.primary_color ?? null,
            },
        });
    } catch (error) {
        console.error('[Signing/verify GET] Error:', error);
        return apiError('Failed to load signing request', { status: 500 });
    }
}

/**
 * POST /api/signing/verify
 *
 * Public endpoint — no auth required.
 * Accepts the typed signature and marks the request as signed.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const validationResult = submitSignatureSchema.safeParse(body);
        if (!validationResult.success) {
            return apiError('Validation failed', {
                status: 400,
                details: zodIssuesToDetails(validationResult.error.issues),
            });
        }

        const { token, typed_name } = validationResult.data;

        // Rate limit by token to prevent brute-force
        try {
            await postLimiter.check(5, token);
        } catch {
            return apiError('Too many requests', { status: 429 });
        }

        const db = getSupabaseAdmin();

        const { data: signingRequest, error } = await db
            .from('signing_requests')
            .select('id, status, expires_at, recipient_email, company_id')
            .eq('signing_token', token)
            .maybeSingle();

        if (error) throw error;

        if (!signingRequest) {
            return apiError('Invalid or expired signing link', { status: 404 });
        }

        if (signingRequest.status === 'cancelled') {
            return apiError('This signing request has been cancelled', { status: 410 });
        }

        if (signingRequest.status === 'signed') {
            return apiError('This document has already been signed', { status: 409 });
        }

        if (signingRequest.expires_at && new Date(signingRequest.expires_at) < new Date()) {
            await db
                .from('signing_requests')
                .update({ status: 'expired' })
                .eq('id', signingRequest.id);

            return apiError('This signing link has expired', { status: 410 });
        }

        const ip = getClientIp(req);
        const userAgent = req.headers.get('user-agent') || null;
        const signedAt = new Date().toISOString();

        const signatureData = {
            typed_name,
            ip_address: ip ?? undefined,
            user_agent: userAgent ?? undefined,
            signed_at: signedAt,
        };

        const { error: updateError } = await db
            .from('signing_requests')
            .update({
                status: 'signed',
                signed_at: signedAt,
                signature_data: signatureData,
            })
            .eq('id', signingRequest.id);

        if (updateError) throw updateError;

        await db.from('signing_audit_log').insert({
            signing_request_id: signingRequest.id,
            action: 'signed',
            actor_email: signingRequest.recipient_email,
            ip_address: ip,
            user_agent: userAgent,
            metadata: { typed_name },
        });

        return NextResponse.json({ success: true, message: 'Document signed successfully' });
    } catch (error) {
        console.error('[Signing/verify POST] Error:', error);
        return apiError('Failed to submit signature', { status: 500 });
    }
}

// ---- Utility ----

function getClientIp(req: NextRequest): string | null {
    // Standard headers in order of preference
    const candidates = [
        req.headers.get('x-forwarded-for'),
        req.headers.get('x-real-ip'),
        req.headers.get('cf-connecting-ip'),
    ];

    for (const candidate of candidates) {
        if (candidate) {
            // x-forwarded-for can be a comma-separated list; take the first
            return candidate.split(',')[0].trim();
        }
    }

    return null;
}
