/**
 * The data bridge — PropFlow's RLS replacement, server-side.
 *
 * The browser keeps speaking the supabase-js builder dialect; the fetch-shim
 * serializes each call here. This route is the ONLY path from a browser to
 * Turso, and it re-creates the live policies' guarantees:
 *
 *   1. identity from OUR session cookie (never from the request body)
 *   2. the caller's profile row (company_id, role) loaded server-side
 *   3. the table's scope from SCOPE_MAP applied as a forced filter on reads
 *      and a forced stamp on writes — client-supplied filters can NARROW a
 *      result set, never widen it
 *   4. unknown tables refused — the deny-by-default RLS posture
 *
 * Turso mode only; otherwise 404 (the browser shim isn't active either).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, type Client } from "@libsql/client";
import { SCOPE_MAP } from "@/lib/supabase/turso-bridge-scope";
import { guardedColumnsIn } from "@/lib/supabase/turso-bridge-guarded-columns";
import { SESSION_COOKIE, verifySession } from "@/lib/supabase/turso-auth";
import { createTursoPostgrest, TursoQueryBuilder } from "@/lib/supabase/turso-postgrest";

export const runtime = "nodejs";

interface FilterSpec { method: string; args: unknown[] }
interface QuerySpec {
  table: string;
  action: "select" | "insert" | "update" | "upsert" | "delete";
  columns?: string;
  count?: "exact" | "estimated";
  head?: boolean;
  filters?: FilterSpec[];
  order?: { column: string; ascending?: boolean }[];
  limit?: number;
  range?: [number, number];
  single?: "single" | "maybe";
  values?: Record<string, unknown> | Record<string, unknown>[];
  onConflict?: string;
  returning?: boolean;
}

const ALLOWED_FILTERS = new Set([
  "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in",
  "contains", "not", "or", "match", "filter",
]);

let _client: Client | null = null;
function turso(): Client {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) throw new Error("Turso not configured");
  _client = createClient({ url, authToken: token });
  return _client;
}

async function callerProfile(client: Client, userId: string):
    Promise<{ companyId: string | null }> {
  // Schema fact (verified against the transpiled DDL): profiles.id IS the auth
  // uid — there is NO user_id column on profiles. The first draft queried
  // `OR user_id = ?` and would have thrown "no such column" on every request.
  const r = await client.execute({
    sql: `SELECT company_id FROM "profiles" WHERE id = ? LIMIT 1`,
    args: [userId],
  });
  const row = r.rows[0] as { company_id?: string } | undefined;
  return { companyId: row?.company_id ? String(row.company_id) : null };
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

  let spec: QuerySpec;
  try {
    spec = (await req.json()) as QuerySpec;
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "invalid request", code: "400" } }, { status: 400 });
  }

  const scope = SCOPE_MAP[spec.table];
  if (!scope) {
    // Deny-by-default: exactly what RLS did for unlisted tables.
    return NextResponse.json({
      data: null,
      error: { message: `table "${spec.table}" is not exposed to the browser bridge`,
               code: "TABLE_NOT_EXPOSED" },
    }, { status: 403 });
  }

  const client = turso();
  const db = createTursoPostgrest(client);
  const profile = await callerProfile(client, session.sub);

  let q = db.from(spec.table) as TursoQueryBuilder;

  // ---- verb + payload (writes get the scope STAMPED, not trusted)
  const stampWrite = (row: Record<string, unknown>): Record<string, unknown> => {
    const out = { ...row };
    if (scope.kind === "company") {
      if (spec.table === "companies") {
        // companies scopes by its own id
        out.id = profile.companyId ?? out.id;
      } else {
        out.company_id = profile.companyId;
      }
    } else if (scope.kind === "user") {
      out[scope.column ?? "user_id"] = session.sub;
    } else if (scope.kind === "self_profile") {
      out.id = session.sub; // profiles.id IS the auth uid
    }
    // via-scoped children are validated below instead (parent ownership check)
    return out;
  };

  // Privilege guard — the port of protect_company_entitlements and
  // protect_profile_privileges. Those triggers bypassed for service_role, and
  // this bridge holds a full-database token, so they no longer stop anything:
  // without this, a logged-in user can set their own company's
  // subscription_plan to 'enterprise' and the write lands.
  if (spec.action === "insert" || spec.action === "upsert" || spec.action === "update") {
    const guarded = guardedColumnsIn(spec.table, spec.values);
    if (guarded.length) {
      return NextResponse.json(
        { data: null, error: {
            message: `protected column(s) require service-role access: ${guarded.join(", ")}`,
            code: "403" } },
        { status: 403 });
    }
  }

  if (spec.action === "insert" || spec.action === "upsert") {
    const rows = Array.isArray(spec.values) ? spec.values : [spec.values ?? {}];
    const stamped = rows.map(stampWrite);
    if (scope.kind === "via") {
      // Parent-ownership check: every referenced parent must belong to the
      // caller's company — the join policy's semantics.
      const parentScope = SCOPE_MAP[scope.parentTable];
      if (parentScope?.kind === "company" && profile.companyId) {
        for (const r of stamped) {
          const pid = r[scope.fkColumn];
          if (pid == null) {
            return NextResponse.json({ data: null,
              error: { message: `${scope.fkColumn} required`, code: "400" } }, { status: 400 });
          }
          const chk = await client.execute({
            sql: `SELECT 1 FROM "${scope.parentTable}" WHERE id = ? AND company_id = ? LIMIT 1`,
            args: [pid as string, profile.companyId],
          });
          if (!chk.rows.length) {
            return NextResponse.json({ data: null,
              error: { message: "parent row not accessible", code: "403" } }, { status: 403 });
          }
        }
      }
    }
    q = (spec.action === "insert"
      ? q.insert(stamped)
      : q.upsert(stamped, { onConflict: spec.onConflict })) as TursoQueryBuilder;
    if (spec.returning !== false) q = q.select(spec.columns ?? "*") as TursoQueryBuilder;
  } else if (spec.action === "update") {
    const values = stampWrite((spec.values as Record<string, unknown>) ?? {});
    q = q.update(values) as TursoQueryBuilder;
    if (spec.returning !== false) q = q.select(spec.columns ?? "*") as TursoQueryBuilder;
  } else if (spec.action === "delete") {
    q = q.delete() as TursoQueryBuilder;
  } else {
    q = q.select(spec.columns ?? "*",
                 { count: spec.count, head: spec.head }) as TursoQueryBuilder;
  }

  // ---- client filters (can only narrow)
  for (const f of spec.filters ?? []) {
    if (!ALLOWED_FILTERS.has(f.method)) {
      return NextResponse.json({ data: null,
        error: { message: `filter ${f.method} not allowed`, code: "400" } }, { status: 400 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    q = (q as any)[f.method](...f.args);
  }

  // ---- the FORCED scope filter (server-authoritative — applied last so a
  //      client filter can never override it; duplicate predicates AND together)
  if (scope.kind === "company") {
    if (!profile.companyId) {
      return NextResponse.json({ data: null,
        error: { message: "no company on profile", code: "403" } }, { status: 403 });
    }
    q = (spec.table === "companies"
      ? q.eq("id", profile.companyId)
      : q.eq("company_id", profile.companyId)) as TursoQueryBuilder;
  } else if (scope.kind === "user") {
    q = q.eq(scope.column ?? "user_id", session.sub) as TursoQueryBuilder;
  } else if (scope.kind === "self_profile") {
    if (spec.action === "select") {
      // read: own row OR company colleagues (live policy allows company reads)
      q = (profile.companyId
        ? (q as any).or(`user_id.eq.${session.sub},company_id.eq.${profile.companyId}`)
        : q.eq("user_id", session.sub)) as TursoQueryBuilder;
    } else {
      q = q.eq("user_id", session.sub) as TursoQueryBuilder; // write: self only
    }
  } else if (scope.kind === "via") {
    const parent = SCOPE_MAP[scope.parentTable];
    if (parent?.kind === "company" && profile.companyId) {
      const ids = await client.execute({
        sql: `SELECT id FROM "${scope.parentTable}" WHERE company_id = ?`,
        args: [profile.companyId],
      });
      const idList = ids.rows.map((r) => String((r as unknown as { id: unknown }).id));
      if (!idList.length && spec.action === "select") {
        return NextResponse.json({ data: [], error: null, count: 0 });
      }
      q = (idList.length
        ? q.in(scope.fkColumn, idList)
        : q.eq(scope.fkColumn, "__none__")) as TursoQueryBuilder;
    }
  }

  // ---- modifiers
  for (const o of spec.order ?? []) q = q.order(o.column, { ascending: o.ascending }) as TursoQueryBuilder;
  if (spec.range) q = q.range(spec.range[0], spec.range[1]) as TursoQueryBuilder;
  else if (spec.limit != null) q = q.limit(spec.limit) as TursoQueryBuilder;
  if (spec.single === "single") q = q.single() as TursoQueryBuilder;
  if (spec.single === "maybe") q = q.maybeSingle() as TursoQueryBuilder;

  const result = await q;
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}
