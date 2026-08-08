/**
 * Password login against the migrated auth store (Turso).
 *
 * Verifies the SAME bcrypt hashes preserved from Supabase into
 * _supabase_auth_users, so nobody resets a password. 404s unless the mode is
 * on; per-IP throttled so bcrypt can't be used as a password oracle.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import {
  SESSION_COOKIE,
  signSession,
  tursoAuthActive,
  verifyPassword,
} from "@/lib/supabase/turso-auth";

export const runtime = "nodejs";

// Sliding-window limiter, per serverless instance. Goal is oracle prevention,
// not DDoS defense (the platform WAF owns that layer).
const BUCKETS = new Map<string, number[]>();
function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (BUCKETS.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    BUCKETS.set(key, arr);
    return true;
  }
  arr.push(now);
  BUCKETS.set(key, arr);
  return false;
}

export async function POST(req: NextRequest) {
  if (!tursoAuthActive()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(`turso-login:${ip}`, 10, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "too many attempts" }, { status: 429 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ error: "auth backend unavailable" }, { status: 503 });
  }

  const session = await verifyPassword(
    createClient({ url, authToken: token }), body.email, body.password);
  if (!session) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({
    ok: true,
    user: { id: session.sub, email: session.email },
  });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: signSession(session),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
