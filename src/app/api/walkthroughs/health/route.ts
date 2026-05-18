import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CheckResult {
  ok: boolean;
  latency_ms?: number;
  message?: string;
}

async function checkSupabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from('walkthrough_jobs')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    if (error) throw error;
    return { ok: true, latency_ms: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latency_ms: Date.now() - start,
      message: err instanceof Error ? err.message : 'unknown',
    };
  }
}

async function checkR2(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET ?? 'propflow-splat-renders';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return { ok: false, message: 'R2 credentials not configured' };
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { ok: true, latency_ms: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latency_ms: Date.now() - start,
      message: err instanceof Error ? err.message : 'unknown',
    };
  }
}

async function checkRunPod(): Promise<CheckResult> {
  const start = Date.now();
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;
  if (!apiKey) return { ok: false, message: 'RUNPOD_API_KEY not configured' };
  if (!endpointId) return { ok: false, message: 'RUNPOD_ENDPOINT_ID not configured (endpoint not deployed yet)' };

  try {
    const res = await fetch(`https://api.runpod.ai/v2/${endpointId}/health`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, latency_ms: Date.now() - start, message: `HTTP ${res.status}` };
    }
    return { ok: true, latency_ms: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latency_ms: Date.now() - start,
      message: err instanceof Error ? err.message : 'unknown',
    };
  }
}

function checkWebhookSecret(): CheckResult {
  const present = Boolean(process.env.WALKTHROUGH_WEBHOOK_SECRET);
  return present
    ? { ok: true }
    : { ok: false, message: 'WALKTHROUGH_WEBHOOK_SECRET not set — webhooks will fail' };
}

export async function GET() {
  const [supabase, r2, runpod, webhook] = await Promise.all([
    checkSupabase(),
    checkR2(),
    checkRunPod(),
    Promise.resolve(checkWebhookSecret()),
  ]);

  const checks = { supabase, r2, runpod, webhook_secret: webhook };
  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 },
  );
}
