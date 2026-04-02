import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { apiError, zodIssuesToDetails } from '@/lib/api-response';
import { rateLimit } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500, prefix: 'api:signing:id' });

const patchSigningRequestSchema = z.object({
    status: z.literal('cancelled'),
});

// GET /api/signing/[id] — Fetch a single signing request by id
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return apiError('Unauthorized', { status: 401 });
        }

        try {
            await limiter.check(60, user.id);
        } catch {
            return apiError('Too many requests', { status: 429 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle();

        if (!profile?.company_id) {
            return apiError('No company associated', { status: 403 });
        }

        const { data, error } = await supabase
            .from('signing_requests')
            .select(`
                *,
                documents (id, title, type),
                sender:profiles!sender_id (id, full_name, email)
            `)
            .eq('id', id)
            .eq('company_id', profile.company_id)
            .maybeSingle();

        if (error) {
            // Graceful fallback without joins
            const { data: fallback, error: fallbackError } = await supabase
                .from('signing_requests')
                .select('*')
                .eq('id', id)
                .eq('company_id', profile.company_id)
                .maybeSingle();

            if (fallbackError) throw fallbackError;
            if (!fallback) return apiError('Signing request not found', { status: 404 });

            return NextResponse.json({ success: true, signing_request: fallback });
        }

        if (!data) {
            return apiError('Signing request not found', { status: 404 });
        }

        return NextResponse.json({ success: true, signing_request: data });
    } catch (error) {
        console.error('[Signing/:id GET] Error:', error);
        return apiError('Failed to fetch signing request', { status: 500 });
    }
}

// PATCH /api/signing/[id] — Update status (cancel only, from dashboard)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return apiError('Unauthorized', { status: 401 });
        }

        try {
            await limiter.check(20, user.id);
        } catch {
            return apiError('Too many requests', { status: 429 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, email')
            .eq('id', user.id)
            .maybeSingle();

        if (!profile?.company_id) {
            return apiError('No company associated', { status: 403 });
        }

        const body = await req.json();

        const validationResult = patchSigningRequestSchema.safeParse(body);
        if (!validationResult.success) {
            return apiError('Validation failed', {
                status: 400,
                details: zodIssuesToDetails(validationResult.error.issues),
            });
        }

        // Verify the request belongs to this company and is in a cancellable state
        const { data: existing } = await supabase
            .from('signing_requests')
            .select('id, status')
            .eq('id', id)
            .eq('company_id', profile.company_id)
            .maybeSingle();

        if (!existing) {
            return apiError('Signing request not found', { status: 404 });
        }

        if (existing.status === 'signed') {
            return apiError('Cannot cancel a signing request that has already been signed', { status: 409 });
        }

        if (existing.status === 'cancelled') {
            return apiError('Signing request is already cancelled', { status: 409 });
        }

        const { data: updated, error: updateError } = await supabase
            .from('signing_requests')
            .update({ status: 'cancelled' })
            .eq('id', id)
            .eq('company_id', profile.company_id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Audit log: cancelled
        getSupabaseAdmin().from('signing_audit_log').insert({
            signing_request_id: id,
            action: 'cancelled',
            actor_email: profile.email ?? user.email,
            metadata: { previous_status: existing.status },
        }).then(({ error }) => {
            if (error) console.warn('[Signing/:id PATCH] Audit log failed:', error.message);
        });

        return NextResponse.json({ success: true, signing_request: updated });
    } catch (error) {
        console.error('[Signing/:id PATCH] Error:', error);
        return apiError('Failed to update signing request', { status: 500 });
    }
}

// DELETE /api/signing/[id] — Soft-delete by setting status to 'cancelled'
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return apiError('Unauthorized', { status: 401 });
        }

        try {
            await limiter.check(20, user.id);
        } catch {
            return apiError('Too many requests', { status: 429 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, email')
            .eq('id', user.id)
            .maybeSingle();

        if (!profile?.company_id) {
            return apiError('No company associated', { status: 403 });
        }

        const { data: existing } = await supabase
            .from('signing_requests')
            .select('id, status')
            .eq('id', id)
            .eq('company_id', profile.company_id)
            .maybeSingle();

        if (!existing) {
            return apiError('Signing request not found', { status: 404 });
        }

        if (existing.status === 'signed') {
            return apiError('Cannot delete a signing request that has already been signed', { status: 409 });
        }

        const { error: deleteError } = await supabase
            .from('signing_requests')
            .update({ status: 'cancelled' })
            .eq('id', id)
            .eq('company_id', profile.company_id);

        if (deleteError) throw deleteError;

        // Audit log: cancelled via delete
        getSupabaseAdmin().from('signing_audit_log').insert({
            signing_request_id: id,
            action: 'cancelled',
            actor_email: profile.email ?? user.email,
            metadata: { method: 'delete', previous_status: existing.status },
        }).then(({ error }) => {
            if (error) console.warn('[Signing/:id DELETE] Audit log failed:', error.message);
        });

        return NextResponse.json({ success: true, message: 'Signing request cancelled' });
    } catch (error) {
        console.error('[Signing/:id DELETE] Error:', error);
        return apiError('Failed to cancel signing request', { status: 500 });
    }
}
