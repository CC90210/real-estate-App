import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { apiError } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron-callable endpoint that marks stuck walkthrough_jobs rows as failed.
 *
 * Authentication: a static bearer token from CRON_SECRET env var (matches the
 * pattern Vercel Cron uses). Anyone hitting this without the right header gets
 * a 401. Designed to be called by Vercel Cron daily or every few hours.
 *
 * Logic lives in the SQL function reap_stale_walkthrough_jobs() — keeps the
 * timeout thresholds in one place and makes the operation atomic.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return apiError('Cron not configured', { status: 503, code: 'cron_not_configured' });
  }
  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (provided !== expected) {
    return apiError('Unauthorized', { status: 401, code: 'unauthorized' });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc('reap_stale_walkthrough_jobs');
  if (error) {
    return apiError('Reap failed', { status: 500, code: 'reap_failed', details: [{ message: error.message }] });
  }

  const reaped = (data as Array<{ job_id: string; prev_status: string; age_minutes: number }> | null) ?? [];

  return NextResponse.json({
    ok: true,
    reaped_count: reaped.length,
    reaped,
    timestamp: new Date().toISOString(),
  });
}
