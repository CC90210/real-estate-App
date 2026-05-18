import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verify } from '@/lib/walkthroughs/webhook-signer';

export const runtime = 'nodejs';

const Body = z.object({
  job_id: z.string().uuid(),
  event: z.enum(['progress', 'succeeded', 'failed']),
  progress_pct: z.number().int().min(0).max(100).optional(),
  error_message: z.string().max(8000).optional(),
  splat_size_bytes: z.number().int().nonnegative().optional(),
  splat_r2_key: z.string().max(512).optional(),
});

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials not configured');
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-walkthrough-signature') ?? '';
  const raw = await req.text();

  if (!verify(raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const body = Body.safeParse(parsed);
  if (!body.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: body.error.flatten() },
      { status: 400 },
    );
  }

  let admin;
  try {
    admin = adminClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'config';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

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

  // Only finalize jobs that have actually been dispatched to RunPod.
  // Defense-in-depth beyond the HMAC: prevents a leaked secret from being
  // used to mark undispatched jobs as succeeded.
  const { data: updated, error } = await admin
    .from('walkthrough_jobs')
    .update(update)
    .eq('id', body.data.job_id)
    .not('runpod_job_id', 'is', null)
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json(
      { error: 'Job not found or not dispatched' },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
