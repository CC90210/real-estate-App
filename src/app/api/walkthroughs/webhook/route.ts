import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verify } from '@/lib/walkthroughs/webhook-signer';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { apiError, zodIssuesToDetails } from '@/lib/api-response';

export const runtime = 'nodejs';

const Body = z.object({
  job_id: z.string().uuid(),
  event: z.enum(['progress', 'succeeded', 'failed']),
  progress_pct: z.number().int().min(0).max(100).optional(),
  error_message: z.string().max(8000).optional(),
  splat_size_bytes: z.number().int().nonnegative().optional(),
  splat_r2_key: z.string().max(512).optional(),
});

const TERMINAL_STATUSES = ['succeeded', 'failed'] as const;

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-walkthrough-signature') ?? '';
  const raw = await req.text();

  if (!verify(raw, signature)) {
    return apiError('Invalid signature', { status: 401, code: 'invalid_signature' });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return apiError('Invalid JSON', { status: 400, code: 'invalid_json' });
  }

  const body = Body.safeParse(parsed);
  if (!body.success) {
    return apiError('Invalid body', {
      status: 400,
      code: 'invalid_body',
      details: zodIssuesToDetails(body.error.issues),
    });
  }

  const admin = getSupabaseAdmin();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  switch (body.data.event) {
    case 'progress':
      update.status = 'training';
      update.progress_pct = body.data.progress_pct ?? 0;
      break;
    case 'succeeded':
      update.status = 'succeeded';
      update.progress_pct = 100;
      update.completed_at = new Date().toISOString();
      if (typeof body.data.splat_size_bytes === 'number')
        update.splat_size_bytes = body.data.splat_size_bytes;
      if (body.data.splat_r2_key) update.splat_r2_key = body.data.splat_r2_key;
      break;
    case 'failed':
      update.status = 'failed';
      update.error_message = body.data.error_message ?? 'Unknown error';
      update.completed_at = new Date().toISOString();
      break;
  }

  // Build the query with two defense-in-depth constraints:
  // 1. runpod_job_id IS NOT NULL — webhook can't finalize undispatched jobs
  // 2. status NOT IN ('succeeded','failed') — out-of-order or replayed events
  //    can't revert a row out of a terminal state (e.g., late 'progress' after 'succeeded')
  let query = admin
    .from('walkthrough_jobs')
    .update(update)
    .eq('id', body.data.job_id)
    .not('runpod_job_id', 'is', null);

  if (body.data.event === 'progress') {
    query = query.not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`);
  }

  const { data: updated, error } = await query.select('id').maybeSingle();

  if (error) {
    return apiError('Update failed', { status: 500, code: 'update_failed' });
  }

  if (!updated) {
    // Either the job wasn't dispatched, or the row is already in a terminal state
    // and this is a stale/replayed event. Both are no-ops from our perspective.
    return NextResponse.json({ ok: true, applied: false });
  }

  return NextResponse.json({ ok: true, applied: true });
}
