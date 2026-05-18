import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { r2 } from '@/lib/walkthroughs/r2-client';

export const runtime = 'nodejs';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials not configured');
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token || token.length < 8 || token.length > 64) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  let admin;
  try {
    admin = adminClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'config';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { data: job } = await admin
    .from('walkthrough_jobs')
    .select('id, status, splat_r2_key, property_id')
    .eq('share_token', token)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
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
