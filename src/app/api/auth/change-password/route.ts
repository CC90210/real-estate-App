/**
 * Change password for a SIGNED-IN user (Turso auth mode).
 *
 * Replaces supabase.auth.updateUser({ password }) on the settings page. The
 * session cookie proves *who* is asking; the current password proves it is
 * really them — a stolen or borrowed session must not be enough to lock the
 * owner out of their own account. Supabase Auth enforced the same rule server
 * side, so this is parity, not a new restriction.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client/web";
import {
  SESSION_COOKIE,
  authDbConfig,
  hashPassword,
  passwordPolicyError,
  tursoAuthActive,
  verifyPasswordForUserId,
  verifySession,
} from "@/lib/supabase/turso-auth";
import { rateLimited } from "@/lib/turso-rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!tursoAuthActive()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const session = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
  }

  // Keyed on the account, not the IP: this is a guess-the-current-password
  // surface, and the attacker here is already inside one session.
  if (rateLimited(`change-pw:${session.sub}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes." }, { status: 429 });
  }

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = (await req.json()) as { currentPassword?: unknown; newPassword?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  if (!currentPassword) {
    return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  }
  const policy = passwordPolicyError(body.newPassword);
  if (policy) return NextResponse.json({ error: policy }, { status: 400 });
  const newPassword = body.newPassword as string;

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "New password must be different from the current one." }, { status: 400 });
  }

  let db;
  try {
    db = createClient(authDbConfig());
  } catch (err) {
    console.error("[auth/change-password] auth backend unavailable:", err);
    return NextResponse.json({ error: "auth backend unavailable" }, { status: 503 });
  }

  const ok = await verifyPasswordForUserId(db, session.sub, currentPassword);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
  }

  const newHash = await hashPassword(newPassword);
  const now = new Date().toISOString();
  const upd = await db.execute({
    sql: `UPDATE "_supabase_auth_users" SET encrypted_password = ?, updated_at = ?
          WHERE id = ? AND deleted_at IS NULL`,
    args: [newHash, now, session.sub],
  });
  if ((upd.rowsAffected ?? 0) === 0) {
    // We verified the same row moments ago, so zero rows means it was deleted
    // underneath us. Never report success for a write that did not land.
    console.error("[auth/change-password] update affected 0 rows for user", session.sub);
    return NextResponse.json({ error: "Unable to update the password." }, { status: 500 });
  }

  // Outstanding reset links are stale the moment the password changes on
  // purpose — otherwise an old email still grants a takeover.
  await db.execute({
    sql: `UPDATE "_auth_tokens" SET used_at = ?
          WHERE email = ? AND purpose = 'password_reset' AND used_at IS NULL`,
    args: [now, session.email.toLowerCase()],
  });

  return NextResponse.json({ ok: true });
}
