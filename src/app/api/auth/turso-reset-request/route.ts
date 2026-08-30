/**
 * Password reset, step 1 — request a reset link (Turso auth mode).
 *
 * Replaces supabase.auth.resetPasswordForEmail. Always answers 200 whether or
 * not the account exists (no user enumeration); when it does exist, a
 * single-use token — sha256 stored, raw value only ever in the email — lands in
 * _auth_tokens with a 1 hour expiry and the link goes out through PropFlow's
 * existing transactional sender.
 *
 * House pattern: breeze-portal app/api/auth/turso-reset-request/route.ts.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client/web";
import { createHash, randomBytes } from "node:crypto";
import { sendPlatformEmail } from "@/lib/email-server";
import { rateLimited, clientIp } from "@/lib/turso-rate-limit";
import { authDbConfig, tursoAuthActive } from "@/lib/supabase/turso-auth";

export const runtime = "nodejs";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  if (!tursoAuthActive()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  // Uniform 200 even when throttled: a different response here would leak that
  // *someone* is hitting this address.
  if (rateLimited(`reset-req:${clientIp(req)}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ ok: true });
  }

  let body: { email?: unknown };
  try {
    body = (await req.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ ok: true });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) return NextResponse.json({ ok: true });

  let db;
  try {
    db = createClient(authDbConfig());
  } catch (err) {
    // Config gap is an operator problem, not a caller problem — say so loudly
    // in the logs and fail with a real status instead of a fake "sent".
    console.error("[auth/turso-reset-request] auth backend unavailable:", err);
    return NextResponse.json({ error: "auth backend unavailable" }, { status: 503 });
  }

  const user = await db.execute({
    sql: `SELECT id FROM "_supabase_auth_users"
          WHERE lower(email) = ? AND deleted_at IS NULL LIMIT 1`,
    args: [email],
  });

  if (user.rows.length) {
    const raw = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    const now = new Date();

    await db.execute({
      sql: `INSERT INTO "_auth_tokens" (token_hash, email, purpose, expires_at, created_at)
            VALUES (?, ?, 'password_reset', ?, ?)`,
      args: [
        tokenHash,
        email,
        new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
        now.toISOString(),
      ],
    });

    const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const link = `${base}/reset-password?turso_token=${raw}`;

    const sent = await sendPlatformEmail({
      to: email,
      subject: "Reset your PropFlow password",
      html:
        `<p>A password reset was requested for this address.</p>`
        + `<p><a href="${link}">Choose a new password</a></p>`
        + `<p>The link is valid for 1 hour and can be used once.</p>`
        + `<p>If you didn't request this, ignore this email — your password is unchanged.</p>`,
      text:
        `A password reset was requested for this address.\n\n`
        + `Reset link (valid 1 hour, single use):\n${link}\n\n`
        + `If you didn't request this, ignore this email — your password is unchanged.`,
    });

    if (!sent.success) {
      // The caller still gets 200 (no enumeration), but this must never vanish:
      // a user waiting on an email that was never sent is a silent outage.
      console.error("[auth/turso-reset-request] reset email FAILED to send:", sent.error);
    }
  }

  return NextResponse.json({ ok: true });
}
