import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { r2 } from '@/lib/walkthroughs/r2-client';
import { checkWalkthroughAccess } from '@/lib/walkthroughs/plan-gate';

export const runtime = 'nodejs';

const PhotoSpec = z.object({
  idx: z.number().int().min(0).max(499),
  content_type: z.string().regex(/^image\/(jpeg|png|webp|heic)$/i),
  ext: z.enum(['jpg', 'jpeg', 'png', 'webp', 'heic']),
});

const Body = z.object({
  property_id: z.string().uuid(),
  photo_count: z.number().int().min(30).max(500),
  photos: z.array(PhotoSpec).min(30).max(500),
});

export async function POST(req: NextRequest) {
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

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.photos.length !== parsed.data.photo_count) {
    return NextResponse.json(
      { error: 'photo_count must match photos.length' },
      { status: 400 },
    );
  }

  const { data: property } = await supabase
    .from('properties')
    .select('id, company_id')
    .eq('id', parsed.data.property_id)
    .maybeSingle();
  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }

  const { data: job, error } = await supabase
    .from('walkthrough_jobs')
    .insert({
      property_id: parsed.data.property_id,
      company_id: property.company_id,
      created_by: user.id,
      photo_count: parsed.data.photo_count,
      status: 'uploading',
    })
    .select('id, share_token')
    .single();

  if (error || !job) {
    return NextResponse.json(
      { error: 'Failed to create walkthrough job' },
      { status: 500 },
    );
  }

  const uploads = await Promise.all(
    parsed.data.photos.map(async (p) => {
      const key = r2.photoKey(job.id, p.idx, p.ext);
      const url = await r2.signedUploadUrl(key, p.content_type, 3600);
      return { idx: p.idx, key, url };
    }),
  );

  return NextResponse.json({
    job_id: job.id,
    share_token: job.share_token,
    uploads,
  });
}
