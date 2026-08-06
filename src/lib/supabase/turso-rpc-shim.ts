/**
 * PropFlow RPC ports — PL/pgSQL rewritten over @libsql/client.
 *
 * Every function receives the caller's scope EXPLICITLY (ctx) rather than
 * reading identity from its args: `/api/data/rpc` resolves ctx from the session
 * cookie, and a browser controls args. Where the original used auth.uid(), the
 * port uses ctx.userId; where it filtered by company, the port uses
 * ctx.companyId. A missing scope predicate is therefore a visible bug in review
 * instead of an implicit trust of client input.
 *
 * Sources: database/rpc_sources/propflow__<name>.sql in Business-Empire-Agent
 * (extracted from the live database 2026-08-06). Ports are being generated and
 * adversarially verified; each one's verification state is recorded in the
 * MANIFEST comment at the bottom when it lands.
 *
 * Until a function appears in PROPFLOW_RPC, calling it returns
 * TURSO_RPC_BLOCKED — fail-closed, never a silent no-op, and never a proxy to
 * Supabase (which would split writes across two databases).
 */
import type { Client } from "@libsql/client";

export interface RpcContext {
  /** Authenticated auth-user id. profiles.id IS the auth uid in this schema. */
  userId: string;
  /** The caller's company, resolved server-side. Null for profile-less users. */
  companyId: string | null;
}

export type RpcFn = (
  client: Client,
  args: Record<string, unknown>,
  ctx: RpcContext,
) => Promise<unknown>;

/**
 * Ported functions. Populated by the porting pass; an empty entry set means
 * every rpc() call fails closed, which is the correct posture pre-flip (the
 * Turso flags are off, so nothing routes here in production yet).
 */
export const PROPFLOW_RPC: Record<string, RpcFn> = {};
