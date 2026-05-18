import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { r2 } from '@/lib/walkthroughs/r2-client';
import { runpod } from '@/lib/walkthroughs/runpod-client';
import { checkWalkthroughAccess } from '@/lib/walkthroughs/plan-gate';

export const runtime = 'nodejs';

const MAX_CONCURRENT_PER_COMPANY = 3;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gate = await checkWalkthroughAccess(user.id);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: gate.reason ?? 'Walkthroughs not available on your plan', upgrade_required: true },
      { status: 403 },
    );
  }

  const { data: job } = await supabase
    .from('walkthrough_jobs')
    .select('id, photo_count, status, company_id')
    .eq('id', id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  if (job.status !== 'uploading') {
    return NextResponse.json(
      { error: `Job in wrong state: ${job.status}` },
      { status: 409 },
    );
  }

  // Concurrency cap — prevent a single company from queueing more GPU jobs
  // than we want running simultaneously. Protects against accidental loops,
  // bulk-upload mistakes, and runaway GPU bills.
  const { data: activeCount } = await supabase.rpc('count_active_walkthroughs', {
    p_company_id: job.company_id,
  });
  const active = typeof activeCount === 'number' ? activeCount : 0;
  // We're about to dispatch this one — so already-in-flight must be < limit.
  // The current row is in 'uploading' state which is counted as active, so
  // subtract 1 to exclude the row we're about to transition out of uploading.
  if (active - 1 >= MAX_CONCURRENT_PER_COMPANY) {
    return NextResponse.json(
      {
        error: `Concurrency limit reached: ${MAX_CONCURRENT_PER_COMPANY} walkthroughs already in flight. Wait for one to finish, or contact support to raise your limit.`,
        active_jobs: active - 1,
        limit: MAX_CONCURRENT_PER_COMPANY,
      },
      { status: 429 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_APP_URL not configured' },
      { status: 500 },
    );
  }

  try {
    const dispatch = await runpod.dispatch({
      job_id: job.id,
      bucket: r2.bucket,
      photo_keys: [r2.photoPrefix(job.id)],
      splat_key: r2.splatKey(job.id),
      webhook_url: `${appUrl}/api/walkthroughs/webhook`,
      photo_count: job.photo_count,
    });

    await supabase
      .from('walkthrough_jobs')
      .update({
        status: 'queued',
        runpod_job_id: dispatch.id,
        started_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return NextResponse.json({ ok: true, runpod_job_id: dispatch.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await supabase
      .from('walkthrough_jobs')
      .update({ status: 'failed', error_message: `Dispatch failed: ${message}` })
      .eq('id', job.id);
    return NextResponse.json({ error: 'Dispatch failed' }, { status: 502 });
  }
}
