import "server-only";
/**
 * The server-side data-plane switch, shared by both PropFlow factories.
 *
 * WHY ONE MODULE. 55 files import lib/supabase/server (session-scoped client)
 * and 11 import lib/supabase/admin (service-role). Rewriting 60+ routes is
 * weeks of risk; wrapping the two factories moves all of them at once — the
 * same leverage that carried breeze and command-center.
 *
 * WHAT SWITCHES: `.from()` (tables) and `.rpc()` (ported PL/pgSQL) go to Turso.
 * WHAT DOESN'T: `.auth` and `.storage` stay on the real Supabase client —
 * server routes still validate sessions during the auth transition, and the 7
 * storage buckets never migrated (Turso is a database, not an object store).
 *
 * Server-only by construction: @libsql/client's native bindings must never be
 * traced into a browser bundle (see the nostalgic-requests build failure).
 */
import { createClient as createLibsql, type Client } from "@libsql/client";
import { createTursoPostgrest } from "./turso-postgrest";
import { PROPFLOW_RPC, type RpcContext } from "./turso-rpc-shim";

let _libsql: Client | null = null;

export function tursoDataActive(): boolean {
  return (
    process.env.EMPIRE_DATA_BACKEND === "turso_cloud" &&
    !!process.env.TURSO_DATABASE_URL &&
    !!process.env.TURSO_AUTH_TOKEN
  );
}

export function tursoClient(): Client {
  if (_libsql) return _libsql;
  _libsql = createLibsql({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
  return _libsql;
}

/**
 * Wrap a Supabase client so its DATA surface runs on Turso.
 *
 * `ctx` carries the caller's scope for RPCs. Server routes that already know
 * the user should pass it; when omitted, RPCs requiring scope fail loudly
 * rather than running unscoped — the deny-by-default posture RLS gave us.
 */
export function withTursoData<T extends object>(
  supa: T,
  ctx?: Partial<RpcContext>,
): T {
  if (!tursoDataActive()) return supa;
  const turso = createTursoPostgrest(tursoClient());

  return new Proxy(supa, {
    get(target, prop, receiver) {
      if (prop === "from") return (table: string) => turso.from(table);
      if (prop === "rpc") {
        return async (name: string, args?: Record<string, unknown>) => {
          const fn = PROPFLOW_RPC[name];
          if (!fn) {
            return {
              data: null,
              count: null,
              status: 400,
              statusText: "Bad Request",
              error: {
                message:
                  `rpc("${name}") has no Turso port — PL/pgSQL did not migrate. ` +
                  `Port it before calling it; proxying to Supabase while tables ` +
                  `live in Turso would split writes across databases.`,
                code: "TURSO_RPC_BLOCKED",
                details: null,
                hint: null,
              },
            };
          }
          if (!ctx?.userId) {
            return {
              data: null,
              count: null,
              status: 400,
              statusText: "Bad Request",
              error: {
                message:
                  `rpc("${name}") needs the caller's scope. Pass ctx to the ` +
                  `factory (getSupabaseAdmin({ userId, companyId })) — running ` +
                  `it unscoped could cross tenants.`,
                code: "TURSO_RPC_NO_CONTEXT",
                details: null,
                hint: null,
              },
            };
          }
          try {
            const data = await fn(tursoClient(), args ?? {}, {
              userId: ctx.userId,
              companyId: ctx.companyId ?? null,
            });
            return { data, error: null, count: null, status: 200, statusText: "OK" };
          } catch (e) {
            return {
              data: null,
              count: null,
              status: 400,
              statusText: "Bad Request",
              error: {
                message: e instanceof Error ? e.message : String(e),
                code: "TURSO_RPC_ERROR",
                details: null,
                hint: null,
              },
            };
          }
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as T;
}
