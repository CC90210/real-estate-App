/**
 * Password reset, step 2 — consume the token, set the new bcrypt hash.
 *
 * Single use is enforced by a conditional UPDATE on used_at (compare-and-swap:
 * two concurrent confirms cannot both win, and a replayed link finds used_at
 * already set). The token is only ever compared by its sha256 — the raw value
 * lives in the user's inbox and nowhere in our database.
 *
 * House pattern: breeze-portal app/api/auth/turso-reset-confirm/route.ts.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { createHash } from "node:crypto";
import { rateLimited, clientIp } from "@/lib/turso-rate-limit";
import {
  authDbConfig,
  hashPassword,
  passwordPolicyError,
  tursoAuthActive,
} from "@/lib/supabase/turso-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!tursoAuthActive()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (rateLimited(`reset-confirm:${clientIp(req)}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes." }, { status: 429 });
  }

  let body: { token?: unknown; password?: unknown };
  try {
    body = (await req.json()) as { token?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const raw = typeof body.token === "string" ? body.token : "";
  if (!raw) {
    return NextResponse.json({ error: "Reset link is invalid or has expired." }, { status: 400 });
  }
  const policy = passwordPolicyError(body.password);
  if (policy) return NextResponse.json({ error: policy }, { status: 400 });
  const password = body.password as string;

  let db;
  try {
    db = createClient(authDbConfig());
  } catch (err) {
    console.error("[auth/turso-reset-confirm] auth backend unavailable:", err);
    return NextResponse.json({ error: "auth backend unavailable" }, { status: 503 });
  }

  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const now = new Date().toISOString();

  // CAS-claim the token: only one confirm can flip used_at from NULL, and an
  // expired row never matches. Claiming BEFORE the password write means a
  // crash between the two burns the link rather than leaving it replayable.
  const claim = await db.execute({
    sql: `UPDATE "_auth_tokens" SET used_at = ?
          WHERE token_hash = ? AND purpose = 'password_reset'
            AND used_at IS NULL AND expires_at > ?`,
    args: [now, tokenHash, now],
  });
  if ((claim.rowsAffected ?? 0) === 0) {
    return NextResponse.json(
      { error: "Reset link is invalid, already used, or expired." }, { status: 400 });
  }

  const row = await db.execute({
    sql: `SELECT email FROM "_auth_tokens" WHERE token_hash = ?`,
    args: [tokenHash],
  });
  const email = String(row.rows[0]?.email ?? "").toLowerCase();
  if (!email) {
    console.error("[auth/turso-reset-confirm] claimed token has no email — row:", tokenHash);
    return NextResponse.json({ error: "Reset link is invalid or has expired." }, { status: 400 });
  }

  const newHash = await hashPassword(password);
  const upd = await db.execute({
    sql: `UPDATE "_supabase_auth_users" SET encrypted_password = ?, updated_at = ?
          WHERE lower(email) = ? AND deleted_at IS NULL`,
    args: [newHash, now, email],
  });
  if ((upd.rowsAffected ?? 0) === 0) {
    // Token was valid but the account is gone/soft-deleted. Loud, because the
    // user just burned their link and will otherwise report "nothing happened".
    console.error("[auth/turso-reset-confirm] no auth user updated for", email);
    return NextResponse.json(
      { error: "That account is no longer active. Contact support." }, { status: 400 });
  }

  // Any other outstanding reset links for this address are now stale — burn
  // them too, so an older email in the same inbox cannot re-take the account.
  await db.execute({
    sql: `UPDATE "_auth_tokens" SET used_at = ?
          WHERE email = ? AND purpose = 'password_reset' AND used_at IS NULL`,
    args: [now, email],
  });

  return NextResponse.json({ ok: true });
}
