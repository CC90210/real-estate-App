/**
 * RPC bridge — ported PL/pgSQL, executed server-side with the caller's scope.
 *
 * The browser shim's rpc() posts here. Identity and company come from the
 * session cookie and the caller's profile row — NEVER from the request body,
 * because a browser controls the body. Each ported function receives that
 * context explicitly (ctx) so a lost scope predicate is a visible bug rather
 * than an implicit trust of client input.
 *
 * Unknown names are refused: PL/pgSQL did not migrate, and silently proxying
 * to Supabase while tables live in Turso would split writes across databases.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, type Client } from "@libsql/client";
import { SESSION_COOKIE, verifySession } from "@/lib/supabase/turso-auth";
import { PROPFLOW_RPC } from "@/lib/supabase/turso-rpc-shim";

export const runtime = "nodejs";

let _client: Client | null = null;
function turso(): Client {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) throw new Error("Turso not configured");
  _client = createClient({ url, authToken: token });
  return _client;
}

export async function POST(req: NextRequest) {
  if (process.env.EMPIRE_AUTH_BACKEND !== "turso" || !process.env.AUTH_SESSION_SECRET) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const session = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json(
      { data: null, error: { message: "unauthorized", code: "401" } }, { status: 401 });
  }

  let body: { name?: string; args?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "invalid request", code: "400" } }, { status: 400 });
  }

  const fn = body.name ? PROPFLOW_RPC[body.name] : undefined;
  if (!fn) {
    return NextResponse.json({
      data: null,
      error: {
        message: `rpc("${body.name}") has no Turso port — PL/pgSQL did not migrate.`,
        code: "TURSO_RPC_BLOCKED",
      },
    }, { status: 400 });
  }

  const client = turso();
  const prof = await client.execute({
    sql: `SELECT company_id FROM "profiles" WHERE id = ? LIMIT 1`,
    args: [session.sub],
  });
  const companyId = (prof.rows[0] as { company_id?: string } | undefined)?.company_id ?? null;

  try {
    const data = await fn(client, body.args ?? {}, {
      userId: session.sub,
      companyId: companyId ? String(companyId) : null,
    });
    return NextResponse.json({ data, error: null });
  } catch (e) {
    return NextResponse.json({
      data: null,
      error: {
        message: e instanceof Error ? e.message : String(e),
        code: "TURSO_RPC_ERROR",
      },
    }, { status: 400 });
  }
}
