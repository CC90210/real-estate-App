import { NextRequest, NextResponse } from 'next/server';
import { r2 } from '@/lib/walkthroughs/r2-client';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { apiError } from '@/lib/api-response';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token || token.length < 8 || token.length > 64) {
    return apiError('Invalid token', { status: 400, code: 'invalid_token' });
  }

  const admin = getSupabaseAdmin();

  const { data: job } = await admin
    .from('walkthrough_jobs')
    .select('id, status, splat_r2_key, property_id')
    .eq('share_token', token)
    .maybeSingle();

  if (!job) {
    return apiError('Tour not found', { status: 404, code: 'not_found' });
  }

  if (job.status !== 'succeeded' || !job.splat_r2_key) {
    return NextResponse.json(
      { error: 'Tour not ready', status: job.status },
      { status: 425 },
    );
  }

  const { data: prop } = await admin
    .from('properties')
    .select('address, city, state')
    .eq('id', job.property_id)
    .maybeSingle();

  const splatUrl = await r2.signedDownloadUrl(job.splat_r2_key, 3600);

  return NextResponse.json({
    splat_url: splatUrl,
    expires_in: 3600,
    property: prop
      ? { address: prop.address, city: prop.city ?? null, state: prop.state ?? null }
      : null,
  });
}
