import "server-only";
/**
 * PropFlow RPC ports — PL/pgSQL rewritten over @libsql/client.
 *
 * Every function receives the caller's scope EXPLICITLY (ctx) rather than
 * reading identity from its args: the callers (/api/data/rpc and the server
 * factories) resolve ctx from the session cookie, and a browser controls args.
 * Where the original used auth.uid(), the port uses ctx.userId; where it
 * filtered by company, the port uses ctx.companyId. A missing scope predicate
 * is therefore a visible bug in review, not an implicit trust of client input.
 *
 * Sources: database/rpc_sources/propflow__<name>.sql in Business-Empire-Agent,
 * extracted from the LIVE database 2026-08-06. Each port was machine-generated
 * and adversarially reviewed; per-RPC verification state is in the MANIFEST at
 * the bottom. Treat "ported-unverified" with the suspicion any untested code
 * deserves.
 *
 * Names absent from PROPFLOW_RPC fail closed (TURSO_RPC_BLOCKED) — never a
 * silent no-op, and never a proxy to Supabase, which would split writes across
 * two databases.
 */
import type { Client } from "@libsql/client/web";

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
 * Port of public.accept_invitation_manually(token_input text) RETURNS boolean.
 *
 * Returns a bare boolean (scalar), matching the PL/pgSQL contract: supabase-js
 * callers read `{ data: true | false }`. The original never RAISEs — every
 * failure path returns false — so this never throws for a bad/expired/foreign
 * invitation either.
 */
export async function accept_invitation_manually(
  client: Client,
  args: Record<string, unknown>,
  ctx: { userId: string; companyId: string | null },
): Promise<unknown> {
  // IF auth.uid() IS NULL THEN RETURN false.
  // Optional-chained and trimmed to match the sibling propflow ports: a shim that
  // registers this in the 2-arg TURSO_RPC_SHIM map must fail closed, not throw.
  const authUid = typeof ctx?.userId === "string" ? ctx.userId.trim() : "";
  if (!authUid) return false;

  // token_input is the only real parameter. A non-string / empty token matches
  // no row in Postgres either (token = NULL is never true), so false is faithful.
  const tokenInput = args.token_input;
  if (typeof tokenInput !== "string" || tokenInput.length === 0) return false;

  const nowIso = new Date().toISOString();

  // TIMESTAMP COMPARISON — do not simplify back to a bare `expires_at > ?`.
  //
  // This DB holds two textual timestamp shapes and `expires_at > ?` is wrong
  // across them. Rows carried over by the Supabase->Turso ETL keep PostgREST's
  // rendering of timestamptz, e.g. '2026-07-29 01:43:18.963+00' (SPACE separator,
  // '+00' offset — confirmed against the live propflow DB). Rows written here or
  // by the schema's own DEFAULT use strftime('%Y-%m-%dT%H:%M:%fZ') =>
  // '2026-08-06T18:30:00.000Z'. Both are fixed-width UTC for their first 19
  // characters, but character 11 is ' ' (0x20) in one and 'T' (0x54) in the other,
  // so a raw string compare of two values on the SAME DATE is decided by that
  // separator rather than by the time: an invitation expiring later today reads
  // as ALREADY EXPIRED.
  //
  // SQLite's date functions cannot rescue this — datetime()/strftime()/julianday()
  // all return NULL on the '+00' offset form (verified on SQLite 3.49.1), which
  // would silently expire every migrated row.
  //
  // So both sides are normalized to 'YYYY-MM-DDTHH:MM:SS' (seconds precision, UTC)
  // before comparing. Dropping sub-second precision can only ever expire an
  // invitation up to one second early — fail-closed, and irrelevant to a 7-day token.
  const nowCmp = nowIso.slice(0, 19);
  const NOT_EXPIRED = (col: string) => `replace(substr(${col},1,19),' ','T') > ?`;

  // Locate the invitation.
  //
  // Deliberately NOT filtered by ctx.companyId: the point of this RPC is to move
  // the caller INTO team_invitations.company_id, which is by definition a company
  // they are not in yet. The original has no company predicate here and adding one
  // would make the function always return false. Tenant safety comes from the two
  // predicates the original actually relies on: the unguessable unique token, and
  // the invite email matching the caller's OWN email — resolved from profiles by
  // ctx.userId, never from args.
  const found = await client.execute({
    sql: `SELECT ti.id, ti.company_id, ti.role
            FROM team_invitations ti
           WHERE ti.token = ?
             AND ti.status = 'pending'
             AND ${NOT_EXPIRED("ti.expires_at")}
             AND lower(ti.email) = (SELECT lower(p.email) FROM profiles p WHERE p.id = ?)
           LIMIT 1`,
    args: [tokenInput, nowCmp, authUid],
  });

  if (found.rows.length === 0) return false;

  const invite = found.rows[0];
  const inviteId = String(invite.id);
  const inviteCompanyId = String(invite.company_id);
  const inviteRole = String(invite.role);

  // Both writes go in one libsql batch (transactional — BEGIN IMMEDIATE, rolled
  // back as a unit on any error), replacing the implicit transaction the plpgsql
  // function body ran in.
  //
  // Statement order is inverted vs. the original (invitation first, then profile)
  // so the invitation UPDATE acts as the compare-and-swap that claims the invite:
  // it re-asserts every predicate from the SELECT above, so a caller who lost a
  // race between the read and the write matches 0 rows. The profile UPDATE is then
  // gated on that claim having actually landed for THIS caller, so it cannot move
  // the caller's company/role on the back of someone else's acceptance.
  //
  // company_id/role are re-asserted as well: they were captured by a read taken
  // OUTSIDE this transaction, so without that predicate an invitation retargeted
  // in between would move the caller onto a company/role it no longer grants.
  const results = await client.batch(
    [
      {
        sql: `UPDATE team_invitations
                 SET status = 'accepted', accepted_at = ?, accepted_by = ?, updated_at = ?
               WHERE id = ?
                 AND token = ?
                 AND status = 'pending'
                 AND ${NOT_EXPIRED("expires_at")}
                 AND company_id = ?
                 AND role = ?
                 AND lower(email) = (SELECT lower(p.email) FROM profiles p WHERE p.id = ?)`,
        args: [
          nowIso,
          authUid,
          nowIso,
          inviteId,
          tokenInput,
          nowCmp,
          inviteCompanyId,
          inviteRole,
          authUid,
        ],
      },
      {
        sql: `UPDATE profiles
                 SET company_id = ?, role = ?, updated_at = ?
               WHERE id = ?
                 AND EXISTS (SELECT 1 FROM team_invitations ti
                              WHERE ti.id = ?
                                AND ti.status = 'accepted'
                                AND ti.accepted_by = ?
                                AND ti.company_id = ?
                                AND ti.role = ?)`,
        args: [
          inviteCompanyId,
          inviteRole,
          nowIso,
          authUid,
          inviteId,
          authUid,
          inviteCompanyId,
          inviteRole,
        ],
      },
    ],
    "write",
  );

  // True only if the caller's profile actually moved onto the invited company/role.
  return (results[1]?.rowsAffected ?? 0) > 0;
}
/**
 * Port of public.check_rate_limit(p_scope text, p_limit integer,
 *                                 p_window_seconds integer DEFAULT 60)
 *   RETURNS TABLE(allowed boolean, current_count integer, reset_at timestamptz)
 *   (SECURITY DEFINER, search_path = public)
 *
 * Source: database/rpc_sources/propflow__check_rate_limit.sql
 * Schema: database/turso_migrations/propflow__000_master_schema.sql
 *
 * TENANT SCOPING: api_rate_limits carries no company_id/tenant_id column (schema
 * lines 23-32) and the PL/pgSQL never calls auth.uid() — there is no company
 * predicate to preserve, so ctx is deliberately not used in the SQL. The bucket
 * key is p_scope, which src/lib/rate-limit.ts:22 composes SERVER-SIDE as
 * `${prefix}:${token}` where token is a client IP on unauthenticated routes
 * (api:auth-signup, api:auth-platform-signup, api:signing:verify:*) and user.id
 * on authenticated ones. Namespacing the bucket by ctx.userId would BREAK the
 * IP-based limiters that guard signup/login — an unauthenticated attacker has no
 * ctx.userId. The scope is passed through verbatim, exactly as in Postgres.
 *
 * TWO INTEGRATION FACTS THE CALLER MUST HANDLE (neither is fixable in here):
 *  (a) withTursoData() refuses any RPC when ctx.userId is absent
 *      (turso-server-hybrid.ts:78 -> TURSO_RPC_NO_CONTEXT), but rate-limit.ts:25
 *      calls getSupabaseAdmin() with NO ctx, and on the signup/verify routes
 *      there IS no user to supply. Left as-is, every call fails and rate-limit.ts
 *      silently degrades to its per-instance in-memory LRU — i.e. no distributed
 *      limit at all on serverless. The dispatcher needs a ctx-free allowlist for
 *      this RPC (or rate-limit.ts must pass a system ctx).
 *  (b) POST /api/data/rpc dispatches every PROPFLOW_RPC entry to ANY authenticated
 *      session with a body-supplied `args`. Once this function is registered, a
 *      logged-in user can name any bucket (e.g. another principal's signup IP) and
 *      exhaust it. The Postgres original had the same PostgREST exposure, so this
 *      is not a regression — but the route should allowlist which RPCs a browser
 *      session may call.
 */
export async function check_rate_limit(
  client: Client,
  args: Record<string, unknown>,
  ctx: { userId: string; companyId: string | null }
): Promise<unknown> {
  // Identity is not part of this RPC's logic (see TENANT SCOPING above); ctx is
  // referenced so the mandated signature does not trip noUnusedParameters.
  void ctx;

  // --- argument coercion (mirrors PostgREST's cast to the Postgres signature) ---
  // int4 bounds are enforced: without them an out-of-range p_window_seconds makes
  // `new Date(...).toISOString()` throw an opaque `RangeError: Invalid time value`
  // instead of the `integer out of range` Postgres raises.
  const INT4_MIN = -2147483648;
  const INT4_MAX = 2147483647;

  const toInt = (value: unknown, raw: unknown): number => {
    let n: number;
    if (typeof value === "bigint") {
      n = Number(value);
    } else if (typeof value === "number") {
      if (!Number.isInteger(value)) {
        throw new Error(
          `invalid input syntax for type integer: "${String(raw)}"`
        );
      }
      n = value;
    } else if (typeof value === "string" && /^[+-]?\d+$/.test(value.trim())) {
      n = Number(value.trim());
    } else {
      throw new Error(`invalid input syntax for type integer: "${String(raw)}"`);
    }
    if (n < INT4_MIN || n > INT4_MAX) {
      throw new Error("integer out of range");
    }
    return n;
  };

  // p_scope is `text`. PostgREST casts a JSON object/array to its JSON *text*;
  // String() would collapse every object to "[object Object]", i.e. two distinct
  // callers sharing one rate-limit bucket. Serialize structurally instead.
  const rawScope = args.p_scope;
  let scope: string | null;
  if (typeof rawScope === "string") {
    scope = rawScope;
  } else if (rawScope === undefined || rawScope === null) {
    scope = null;
  } else if (typeof rawScope === "object") {
    scope = JSON.stringify(rawScope);
  } else {
    scope = String(rawScope);
  }

  // IF p_scope IS NULL OR btrim(p_scope) = '' OR p_limit < 1 THEN RAISE
  // p_limit has no DEFAULT in the signature, so PostgREST always supplies it.
  // A NULL p_limit makes the Postgres guard NULL (not TRUE) and yields
  // allowed = NULL — an ambiguous "maybe" for a rate limiter. Ported fail-closed:
  // a missing/NULL limit is an invalid parameter. (Noted divergence.)
  if (scope === null || scope.trim() === "") {
    throw new Error("Invalid rate-limit parameters");
  }
  if (args.p_limit === undefined || args.p_limit === null) {
    throw new Error("Invalid rate-limit parameters");
  }
  const pLimit = toInt(args.p_limit, args.p_limit);
  if (pLimit < 1) {
    throw new Error("Invalid rate-limit parameters");
  }

  // seconds integer := greatest(COALESCE(p_window_seconds, 60), 1)
  const rawWindow = args.p_window_seconds;
  const seconds =
    rawWindow === undefined || rawWindow === null
      ? 60
      : Math.max(toInt(rawWindow, rawWindow), 1);

  // current_time timestamptz := now()  — one clock read for the whole call,
  // exactly like the PL/pgSQL DECLARE.
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // bucket_start := to_timestamp(floor(extract(epoch FROM current_time) / seconds) * seconds)
  const bucketStartMs = Math.floor(nowMs / 1000 / seconds) * seconds * 1000;
  const bucketStartIso = new Date(bucketStartMs).toISOString();
  // expires_at := bucket_start + make_interval(secs => seconds * 2)
  const expiresAtIso = new Date(bucketStartMs + seconds * 2000).toISOString();
  // reset_at := bucket_start + make_interval(secs => seconds)
  const resetAtIso = new Date(bucketStartMs + seconds * 1000).toISOString();

  // One write transaction (libsql batch is transactional) so the GC sweep and the
  // counter bump land together, as they did inside the single Postgres function
  // call. The counter itself is a single conditional upsert against the
  // api_rate_limits_scope_window_start_key unique index — the increment happens
  // inside the engine, so N concurrent callers get N distinct counts and can never
  // both read the same pre-value. Timestamps are fixed-width UTC ISO-8601, which is
  // why the TEXT comparison in the DELETE sorts chronologically.
  const [, upsertRes] = await client.batch(
    [
      {
        // DELETE FROM public.api_rate_limits WHERE expires_at < current_time
        sql: `DELETE FROM "api_rate_limits" WHERE "expires_at" < ?`,
        args: [nowIso],
      },
      {
        // INSERT ... VALUES (p_scope, bucket_start, 1, bucket_start + 2*window)
        // ON CONFLICT (scope, window_start) DO UPDATE
        //   SET count = api_rate_limits.count + 1, updated_at = current_time
        // RETURNING count
        // (created_at/updated_at are written explicitly: the Postgres
        //  set_api_rate_limits_updated_at trigger was not transpiled.)
        sql: `INSERT INTO "api_rate_limits"
                ("id", "scope", "window_start", "count", "expires_at", "created_at", "updated_at")
              VALUES (?, ?, ?, 1, ?, ?, ?)
              ON CONFLICT ("scope", "window_start") DO UPDATE
                SET "count" = "api_rate_limits"."count" + 1,
                    "updated_at" = ?
              RETURNING "count" AS "current_count"`,
        args: [
          crypto.randomUUID(),
          scope,
          bucketStartIso,
          expiresAtIso,
          nowIso,
          nowIso,
          nowIso,
        ],
      },
    ],
    "write"
  );

  const row = upsertRes.rows[0] as unknown as
    | Record<string, unknown>
    | undefined;
  if (row === undefined) {
    // RETURNING on an upsert always yields the surviving row; a miss means the
    // write did not land. Fail loud rather than reporting a fabricated count.
    throw new Error("check_rate_limit: rate-limit upsert returned no row");
  }
  const currentCount = Number(row.current_count);

  // RETURNS TABLE + a single RETURN NEXT => PostgREST emits a one-element array,
  // which is what src/lib/rate-limit.ts unwraps via Array.isArray(data) ? data[0] : data.
  return [
    {
      allowed: currentCount <= pLimit, // allowed := current_count <= p_limit
      current_count: currentCount,
      reset_at: resetAtIso,
    },
  ];
}
/**
 * Caller context injected by the RPC dispatcher.
 *
 * `isServiceRole` is not decoration — it reproduces a Postgres role distinction
 * this RPC actually depended on. The shim is dispatched from
 * getServiceSupabase() (see oasis-rpc-shim.ts header), whose key BYPASSES RLS
 * (brain/SECURITY_MODEL.md:63-68). A SECURITY INVOKER function called with that
 * key therefore ran WITHOUT the walkthrough_jobs_company_access policy. It is
 * optional and defaults to false so a dispatcher that has not been taught about
 * it fails closed (tenant-scoped), never open.
 */
export interface RpcCallerContext {
  userId: string;
  companyId: string | null;
  isServiceRole?: boolean;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Postgres `uuid` is a value type, not text: 'A1B2…' and 'a1b2…' are the SAME
 * uuid and compared equal, and a non-uuid string raised 22P02 rather than
 * quietly counting zero. A raw JS string compare against TEXT company_id loses
 * both behaviours, so browser-supplied ids are parsed as uuids here.
 */
function parseUuidArg(value: unknown, argName: string): string {
  const text = String(value).trim().toLowerCase();
  if (!UUID_RE.test(text)) {
    throw new Error(
      `invalid input syntax for type uuid: "${String(value)}" (${argName})`
    );
  }
  return text;
}

export async function count_active_walkthroughs(
  client: Client,
  args: Record<string, unknown>,
  ctx?: RpcCallerContext
): Promise<unknown> {
  // Source: public.count_active_walkthroughs(p_company_id uuid) RETURNS integer
  //   LANGUAGE sql STABLE, SET search_path TO 'public' (SECURITY INVOKER):
  //     SELECT count(*)::integer FROM public.walkthrough_jobs
  //     WHERE company_id = p_company_id
  //       AND status IN ('uploading', 'queued', 'training');
  //
  // Schema: database/turso_migrations/propflow__000_master_schema.sql:868
  //   walkthrough_jobs(id TEXT PK, company_id TEXT NOT NULL, property_id TEXT
  //                    NOT NULL, status TEXT NOT NULL DEFAULT 'pending', ...)
  //   index walkthrough_jobs_company_idx (company_id) covers the predicate.
  //
  // EFFECTIVE POSTGRES PREDICATE DEPENDED ON THE CALLER'S ROLE — the port must
  // reproduce both branches, not just the first:
  //
  //   authenticated (browser JWT): RLS policy walkthrough_jobs_company_access
  //     (cmd ALL, roles {authenticated}, USING company_id = get_user_company_id())
  //     stacked on top of the SECURITY INVOKER body, so the wire predicate was
  //         company_id = get_user_company_id() AND company_id = p_company_id
  //     p_company_id could only NARROW the caller's own company, never widen it.
  //
  //   service_role (getServiceSupabase): RLS bypassed entirely, so it was just
  //         company_id = p_company_id
  //     Cross-company reads were legitimate and expected here — the sibling RPC
  //     propflow__generate_invoice_number.sql encodes exactly this distinction
  //     ("IF p_company_id <> get_user_company_id() AND auth.role() IS DISTINCT
  //     FROM 'service_role' THEN RAISE EXCEPTION 'Forbidden'"). Collapsing this
  //     branch into the authenticated one returns a fabricated 0 to every
  //     server-side caller.

  if (ctx === undefined || ctx === null) {
    // Do NOT fall back to args for the tenant scope: args is browser-controlled,
    // and a fabricated 0 would be worse than a stack trace. This is a wiring
    // bug, not a data case, so it fails loudly and names its own fix.
    throw new Error(
      "count_active_walkthroughs: missing caller context. TURSO_RPC_SHIM is " +
        "typed (client, args) => Promise<unknown>; widen it to " +
        "(client, args, ctx: RpcCallerContext) and pass ctx from the " +
        "dispatcher. Refusing to infer a tenant scope from browser input."
    );
  }

  // Browser-controlled. Omitted or explicit NULL => Postgres compared
  // `company_id = NULL`, which is never true.
  const requestedCompanyId: string | null =
    args.p_company_id === undefined || args.p_company_id === null
      ? null
      : parseUuidArg(args.p_company_id, "p_company_id");

  // Server-side session value; normalised (not validated) because it comes from
  // our own dispatcher, and Postgres get_user_company_id() already returned uuid.
  const sessionCompanyId: string | null =
    typeof ctx.companyId === "string" && ctx.companyId.trim() !== ""
      ? ctx.companyId.trim().toLowerCase()
      : null;

  let scopeCompanyId: string | null;

  if (ctx.isServiceRole === true) {
    // RLS bypassed: the only surviving predicate is company_id = p_company_id.
    // NULL/omitted stays 0 — that is what `company_id = NULL` returned.
    scopeCompanyId = requestedCompanyId;
  } else if (sessionCompanyId === null) {
    // get_user_company_id() IS NULL => the RLS USING clause matched no row.
    scopeCompanyId = null;
  } else if (
    requestedCompanyId !== null &&
    requestedCompanyId !== sessionCompanyId
  ) {
    // Conjunction unsatisfiable => 0 rows. Never a cross-tenant read.
    scopeCompanyId = null;
  } else {
    // Omitted p_company_id falls back to the session company. This is the one
    // deliberate deviation: PostgREST rejected a call omitting a non-DEFAULT
    // argument. It can only ever return the caller's own count, so it is not a
    // leak — but if the new call shape always sends p_company_id, delete this
    // branch and throw for the omission like increment_promo_uses does.
    scopeCompanyId = sessionCompanyId;
  }

  if (scopeCompanyId === null) return 0;

  // Single read statement, exactly like the STABLE SQL original. Bound value is
  // canonical-lowercase uuid text, matching how every company_id lands in this
  // table (Postgres renders uuid lowercase; the Turso DEFAULT generator is
  // lower(hex(randomblob(...)))), so walkthrough_jobs_company_idx still seeks.
  const res = await client.execute({
    sql: `SELECT count(*) AS "count" FROM "walkthrough_jobs"
          WHERE "company_id" = ?
            AND "status" IN ('uploading', 'queued', 'training')`,
    args: [scopeCompanyId],
  });

  // RETURNS integer => supabase-js callers read a plain number in { data }.
  // libsql may hand back a bigint depending on the client's intMode, so coerce.
  const raw = (res.rows[0] as unknown as Record<string, unknown> | undefined)
    ?.count;
  return Number(raw ?? 0);
}
/**
 * Port of public.ensure_user_profile() RETURNS jsonb (SECURITY DEFINER).
 *
 * Source: database/rpc_sources/propflow__ensure_user_profile.sql
 * Schema: database/turso_migrations/propflow__000_master_schema.sql
 *
 * IDENTITY. The PL/pgSQL called auth.uid() three times (the null check, the
 * profile-existence check, and the auth.users lookup). All three become
 * ctx.userId — profiles.id IS the auth uid, there is no profiles.user_id.
 * Nothing identity-bearing is read from args, and there is deliberately NO
 * args.auth_uid fallback: args are browser-reachable, and a fallback here would
 * let a caller mint an admin profile for any uid.
 *
 * DISPATCH CONTRACT. This function needs a third parameter, so the existing
 * `TURSO_RPC_SHIM: Record<string, (client, args) => Promise<unknown>>` type must
 * be widened to `(client, args, ctx) => Promise<unknown>` before registering it.
 * A dispatcher that still calls with two arguments hits the explicit guard below
 * and throws a named wiring error rather than a bare TypeError.
 *
 * THE auth.users GAP. The original read the auth row for email and the
 * raw_user_meta_data keys company_name / full_name / job_title. The transpiled
 * Turso database has 43 tables and none of them is an auth mirror, so those
 * attributes have no ambient equivalent over libsql and must be injected by the
 * server-side caller through args — the same convention get_portal_logs already
 * uses for args.auth_uid in this shim. Note that full_name / company_name /
 * job_title were ALREADY browser-controlled in the original: raw_user_meta_data
 * is whatever the client passed to signUp({ options: { data } }). Accepting them
 * from args is therefore not a downgrade. args.email is the one field that was
 * auth-verified in Postgres and is not here — the caller MUST populate it from
 * the verified session, never from a request body.
 *
 * ctx.companyId is intentionally unused: this function's entire purpose is to
 * bootstrap a user who has no company yet, and it creates one. The original had
 * no company predicate and no cross-company join, so none is invented here. A
 * caller that already has a companyId necessarily has a profile and exits at
 * the existence check above.
 */

/**
 * companies.trial_ends_at carried DEFAULT (now() + '14 days'::interval) in
 * Postgres and the original INSERT relied on it. The transpile DROPPED that
 * default (propflow__transpile_report.json → lossy.defaults_dropped →
 * "companies.trial_ends_at: (now() + '14 days'::interval)"), so leaving the
 * column to the schema silently gives every new tenant a NULL trial window.
 * Written explicitly here to preserve the original's observable effect. The
 * systemic fix is to restore the default in the transpiled DDL so every company
 * insert path gets it, not just this one.
 */
const TRIAL_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

export async function ensure_user_profile(
  client: Client,
  args: Record<string, unknown>,
  ctx: { userId: string; companyId: string | null }
): Promise<unknown> {
  // A two-argument dispatcher would otherwise die on `ctx.userId` with an
  // anonymous TypeError. Name the contract instead. Refusing rather than
  // falling back to args is the point: args are browser-reachable.
  if ((ctx as unknown) == null) {
    throw new Error(
      "ensure_user_profile: missing identity context. This RPC is SECURITY DEFINER " +
        "on auth.uid(); the shim dispatcher must pass ctx.userId from the verified " +
        "session. Refusing to fall back to args (browser-controlled)."
    );
  }

  // IF auth.uid() IS NULL THEN RETURN jsonb_build_object('status','error',...)
  const authUid = typeof ctx.userId === "string" ? ctx.userId.trim() : "";
  if (authUid === "") {
    return { status: "error", message: "Not authenticated" };
  }

  // IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
  const existing = await client.execute({
    sql: 'SELECT 1 FROM "profiles" WHERE "id" = ? LIMIT 1',
    args: [authUid],
  });
  if (existing.rows.length > 0) {
    return { status: "success", message: "Profile already exists" };
  }

  // --- stand-in for `SELECT * INTO auth_user_record FROM auth.users` --------

  // Mirrors jsonb `->> 'key'`: text for scalars, JSON text for containers,
  // SQL NULL for an absent key or a JSON null.
  const jsonbText = (v: unknown): string | null => {
    if (v === undefined || v === null) return null;
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return JSON.stringify(v);
  };

  let meta: Record<string, unknown> = {};
  const metaRaw = args.raw_user_meta_data ?? args.user_metadata;
  if (typeof metaRaw === "string") {
    // A jsonb column can never hold invalid JSON, so an unparseable string is a
    // caller-side encoding bug; treat it as an empty object, which makes every
    // `->> key` yield NULL exactly as Postgres would for a missing key.
    try {
      const parsed: unknown = JSON.parse(metaRaw);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        meta = parsed as Record<string, unknown>;
      }
    } catch {
      meta = {};
    }
  } else if (metaRaw !== null && typeof metaRaw === "object" && !Array.isArray(metaRaw)) {
    meta = metaRaw as Record<string, unknown>;
  }

  // raw_user_meta_data->>'key', falling back to a flat top-level arg of the same
  // name so a caller can inject either shape. The nested form is checked first
  // because it is what the original actually read.
  const metaKey = (key: string): string | null => {
    const nested = jsonbText(meta[key]);
    return nested !== null ? nested : jsonbText(args[key]);
  };

  // auth_user_record.email. Absent/NULL reproduces the original's failure mode:
  // lower(NULL) -> NULL into profiles.email, which is NOT NULL, and
  // ensure_user_profile (unlike ensure_user_profile_admin) has no EXCEPTION
  // block, so the violation propagates to the caller.
  const authEmail = typeof args.email === "string" ? args.email : jsonbText(args.email);
  if (authEmail === null) {
    throw new Error(
      'null value in column "email" of relation "profiles" violates not-null constraint'
    );
  }

  // lower() in JS, not SQL: SQLite's lower() is ASCII-only, Postgres' is not.
  const emailLower = authEmail.toLowerCase();

  // COALESCE(NULLIF(raw_user_meta_data->>'company_name',''), 'My Company')
  const metaCompanyName = metaKey("company_name");
  const companyName =
    metaCompanyName !== null && metaCompanyName !== "" ? metaCompanyName : "My Company";

  // COALESCE(NULLIF(raw_user_meta_data->>'full_name',''), split_part(email,'@',1))
  // split_part runs on the RAW email, not the lowered one, and returns the whole
  // string when there is no '@'.
  const metaFullName = metaKey("full_name");
  const fullName =
    metaFullName !== null && metaFullName !== "" ? metaFullName : authEmail.split("@")[0];

  // raw_user_meta_data->>'job_title' — no COALESCE in the source, so NULL and ''
  // both pass through unchanged.
  const jobTitle = metaKey("job_title");

  // One instant for all three rows, like Postgres' transaction-time now().
  const now = new Date();
  const nowIso = now.toISOString();
  const trialEndsAt = new Date(now.getTime() + TRIAL_PERIOD_MS).toISOString();
  const newCompanyId = crypto.randomUUID();
  const subscriptionId = crypto.randomUUID();

  // The PL/pgSQL body was one transaction: if the profiles INSERT failed, the
  // companies INSERT rolled back with it. client.batch(..., "write") is
  // transactional in libsql and reproduces that all-or-nothing behaviour, so a
  // failure can never strand an orphan company or a subscription without a
  // profile. Ids are generated client-side because SQLite cannot feed a
  // RETURNING value from one batch statement into the next.
  try {
    await client.batch(
      [
        {
          sql:
            'INSERT INTO "companies" ("id","name","email","trial_ends_at","created_at","updated_at") ' +
            "VALUES (?, ?, ?, ?, ?, ?)",
          args: [newCompanyId, companyName, emailLower, trialEndsAt, nowIso, nowIso],
        },
        {
          sql:
            'INSERT INTO "profiles" ' +
            '("id","company_id","email","full_name","job_title","role","created_at","updated_at") ' +
            "VALUES (?, ?, ?, ?, ?, 'admin', ?, ?)",
          args: [authUid, newCompanyId, emailLower, fullName, jobTitle, nowIso, nowIso],
        },
        {
          sql:
            'INSERT INTO "automation_subscriptions" ' +
            '("id","company_id","is_active","tier","created_at","updated_at") ' +
            "VALUES (?, ?, 1, 'professional', ?, ?)",
          args: [subscriptionId, newCompanyId, nowIso, nowIso],
        },
      ],
      "write"
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Two concurrent callers can both pass the existence check above; the loser
    // collides on the profiles primary key and the whole batch rolls back, so no
    // orphan company survives. profiles has no other unique constraint in the
    // transpiled schema (profiles_email_lower_idx was dropped by the transpile),
    // so a UNIQUE failure on profiles can only be the id. Returning the
    // already-exists shape makes the race idempotent instead of surfacing a
    // constraint error; it is a shape the function already defines. Every other
    // error — including SQLITE_BUSY — is rethrown untouched.
    const pkCollision =
      /unique constraint failed:\s*"?profiles"?\s*\.\s*"?id"?/i.test(msg) ||
      (/primary key must be unique/i.test(msg) && /profiles/i.test(msg));
    if (pkCollision) {
      return { status: "success", message: "Profile already exists" };
    }
    throw e;
  }

  return { status: "success", message: "Profile created" };
}
export async function ensure_user_profile_admin(
  client: Client,
  args: Record<string, unknown>,
  ctx: { userId: string; companyId: string | null },
): Promise<unknown> {
  const a = args ?? {};

  // PL/pgSQL text params: `undefined` must never reach a libsql bind slot.
  const text = (v: unknown): string | null =>
    v === null || v === undefined ? null : typeof v === 'string' ? v : String(v);
  // NULLIF(x, '') — matches the original exactly: empty string only, no trimming.
  const nullIfEmpty = (v: string | null): string | null => (v === '' ? null : v);
  // lower(x) — SQL lower(NULL) is NULL.
  const lower = (v: string | null): string | null => (v === null ? null : v.toLowerCase());

  // Identity comes from ctx ONLY. The original took `u_id` as a parameter, but a browser
  // controls `args`, so args.u_id is never used as the identity we write.
  const userId = typeof ctx?.userId === 'string' ? ctx.userId.trim() : '';
  if (!userId) {
    // The original never RAISEs — every exit is a jsonb object that callers read as
    // `data.status`. Throwing here would flip the value into supabase-js's `error` slot
    // and leave `data` null, so `data.status` would blow up in the caller. The sibling
    // RPC (public.ensure_user_profile) returns this exact status/message pair for the
    // unauthenticated case, so it is the in-family value.
    return { status: 'error', message: 'Not authenticated' };
  }

  // The `_admin` variant existed so a trusted caller could provision a profile for a
  // *different* uid. That capability is gone (identity is ctx-bound), so a call that
  // still asks for someone else must fail loudly rather than silently provision the
  // CALLER's own profile and report 'Profile created' — that would look like success
  // while writing the wrong row. Benign callers pass their own uid and are unaffected;
  // the compare is case/whitespace-insensitive so a non-canonical uuid string still matches.
  const requestedId = text(a.u_id);
  if (
    requestedId !== null &&
    requestedId.trim() !== '' &&
    requestedId.trim().toLowerCase() !== userId.toLowerCase()
  ) {
    console.error(
      'ensure_user_profile_admin: args.u_id does not match the authenticated caller; refusing. ' +
        'A trusted server-side bootstrap needs a separate service-role path.',
      { callerId: userId },
    );
    return { status: 'error', message: 'Profile initialization failed' };
  }

  const email = lower(text(a.u_email));
  const companyName = nullIfEmpty(text(a.c_name)) ?? 'My Company';
  const fullName = nullIfEmpty(text(a.f_name)) ?? 'New User';
  const jobTitle = text(a.j_title);

  const profileExists = async (): Promise<boolean> => {
    const rs = await client.execute({
      sql: 'SELECT 1 FROM profiles WHERE id = ? LIMIT 1',
      args: [userId],
    });
    return rs.rows.length > 0;
  };

  // IF EXISTS (SELECT 1 FROM profiles WHERE id = u_id) -> early success.
  // profiles.id IS the auth uid; there is no profiles.user_id column.
  if (await profileExists()) {
    return { status: 'success', message: 'Profile already exists' };
  }

  const newCompanyId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    // One transaction. profiles.id is the PRIMARY KEY (plus the profiles_pkey UNIQUE
    // index), so a concurrent second caller's profile INSERT fails and rolls back its own
    // company + subscription rows with it — one user can never end up owning two companies.
    await client.batch(
      [
        {
          sql: 'INSERT INTO companies (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          args: [newCompanyId, companyName, email, now, now],
        },
        {
          sql:
            'INSERT INTO profiles (id, company_id, email, full_name, job_title, role, created_at, updated_at) ' +
            "VALUES (?, ?, ?, ?, ?, 'admin', ?, ?)",
          args: [userId, newCompanyId, email, fullName, jobTitle, now, now],
        },
        {
          sql:
            'INSERT INTO automation_subscriptions (id, company_id, is_active, tier, created_at, updated_at) ' +
            "VALUES (?, ?, 1, 'professional', ?, ?)",
          args: [crypto.randomUUID(), newCompanyId, now, now],
        },
      ],
      'write',
    );

    return { status: 'success', message: 'Profile created' };
  } catch (err) {
    // Mirrors `EXCEPTION WHEN OTHERS` — the caller's contract is a data object, not a
    // thrown error — but the root cause is logged rather than silently swallowed.
    console.error('ensure_user_profile_admin: initialization failed', { userId, err });

    try {
      // Lost a signup race (double-clicked button): the profile exists now, so report the
      // truth instead of the original's misleading failure message.
      if (await profileExists()) {
        return { status: 'success', message: 'Profile already exists' };
      }
    } catch (recheckErr) {
      console.error('ensure_user_profile_admin: post-failure recheck failed', recheckErr);
    }

    return { status: 'error', message: 'Profile initialization failed' };
  }
}
export async function generate_invoice_number(
  client: Client,
  args: Record<string, unknown>,
  // `role` is optional and MUST be populated by trusted server code only. Callers
  // that already pass { userId, companyId } keep their exact previous behaviour.
  ctx: { userId: string; companyId: string | null; role?: string | null },
): Promise<unknown> {
  // The RPC took p_company_id and compared it against get_user_company_id().
  // args is browser-controlled, so the tenant is taken from ctx only; a supplied
  // company id may reject the call but may never select the company — except on
  // the service_role path below, which the original SQL explicitly allowed and
  // which is reachable only when ctx (server-built, never args) says so.
  const isServiceRole = ctx?.role === 'service_role';

  // Normalise through String() so a non-string payload can't slip past the
  // mismatch guard the way `typeof supplied === 'string'` let it.
  const rawSupplied =
    args?.p_company_id !== undefined ? args.p_company_id : args?.company_id;
  const supplied =
    rawSupplied === undefined || rawSupplied === null || rawSupplied === ''
      ? null
      : String(rawSupplied);

  let companyId: string | null;
  if (isServiceRole) {
    // Original: `auth.role() IS DISTINCT FROM 'service_role'` short-circuits the
    // guard, so service_role targets whatever p_company_id it passed. A bogus or
    // absent id fell through to `UPDATE ... WHERE id = NULL` -> next_number IS
    // NULL -> 'Company not found', which is reproduced exactly.
    companyId = supplied ?? ctx?.companyId ?? null;
    if (!companyId) throw new Error('Company not found');
  } else {
    // Optional chaining, not `ctx.companyId`: if the dispatcher is wired with the
    // 2-arg shim signature (see TURSO_RPC_SHIM), ctx arrives undefined and the
    // direct property read throws TypeError — a 500 instead of a fail-closed 403.
    companyId = ctx?.companyId ?? null;
    // Deliberately NOT reproducing a Postgres quirk: when get_user_company_id()
    // returned NULL, `p_company_id <> NULL` evaluated to NULL (never TRUE), so a
    // company-less caller slipped past the guard and could bump any company's
    // counter. Fail closed instead.
    if (!companyId) throw new Error('Forbidden');
    // An empty userId would otherwise be matched against profiles.id by the
    // EXISTS below; refuse it here rather than rely on no '' row existing.
    if (typeof ctx?.userId !== 'string' || ctx.userId === '') {
      throw new Error('Forbidden');
    }
    if (supplied !== null && supplied !== companyId) throw new Error('Forbidden');
  }

  const toInt = (value: unknown): number | null => {
    if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : null;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
    }
    return null;
  };

  // get_user_company_id() is `SELECT company_id FROM profiles WHERE id = auth.uid()`,
  // so membership is asserted in SQL against profiles.id = ctx.userId. Both
  // statements carry the identical predicate, which is what lets the SELECT stand
  // in as proof that the UPDATE applied. service_role skips it, as the original did.
  const MEMBER =
    'EXISTS (SELECT 1 FROM profiles p WHERE p.id = ? AND p.company_id = companies.id)';
  const guardSql = isServiceRole ? '' : ' AND ' + MEMBER;
  const guardArgs: unknown[] = isServiceRole ? [] : [ctx.userId];

  // Built per attempt so a busy-retry stamps updated_at at the time of the write
  // that actually lands — the PG trigger set_companies_updated_at did the same.
  const buildBatch = () => [
    {
      sql:
        'UPDATE companies SET next_invoice_number = next_invoice_number + 1, updated_at = ? ' +
        'WHERE id = ?' + guardSql,
      args: [new Date().toISOString(), companyId, ...guardArgs],
    },
    {
      sql:
        'SELECT next_invoice_number - 1 AS assigned_number, invoice_prefix AS invoice_prefix ' +
        'FROM companies WHERE id = ?' + guardSql,
      args: [companyId, ...guardArgs],
    },
  ];

  // batch(..., 'write') is BEGIN IMMEDIATE .. COMMIT: the write lock is taken
  // before the UPDATE and held past the SELECT, so no other caller can observe or
  // consume the same counter value. A failure rolls the whole batch back, which is
  // what makes the transient retry below safe (no number is burned).
  const runBatch = async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await client.batch(buildBatch() as any, 'write');
      } catch (err) {
        const code = String((err as { code?: unknown } | null)?.code ?? '');
        const message = String((err as { message?: unknown } | null)?.message ?? err ?? '');
        if (attempt >= 3 || !/busy|locked/i.test(code + ' ' + message)) throw err;
        await new Promise((resolve) =>
          setTimeout(resolve, 25 * Math.pow(2, attempt) + Math.random() * 25),
        );
      }
    }
  };
  const results = await runBatch();

  const affected = results[0]?.rowsAffected;
  const row = results[1]?.rows?.[0];

  if (!row || (typeof affected === 'number' && affected < 1)) {
    // Same two outcomes the PL/pgSQL had: the row was missing, or the caller had
    // no business touching it. service_role carries no membership predicate, so
    // for it the only reachable cause is a missing row.
    const probe = await client.execute({
      sql: 'SELECT 1 AS present FROM companies WHERE id = ?',
      args: [companyId],
    });
    if (probe.rows.length === 0 || isServiceRole) throw new Error('Company not found');
    throw new Error('Forbidden');
  }

  const assigned = toInt(row.assigned_number);
  if (assigned === null) throw new Error('Company not found');
  const prefix = typeof row.invoice_prefix === 'string' ? row.invoice_prefix : '';

  // Postgres returned text: prefix || lpad(n::text, 5, '0'). padStart pads but
  // never truncates — PG's lpad silently truncated past 99999 and collided.
  return prefix + String(assigned).padStart(5, '0');
}
/**
 * Port of public.get_enhanced_dashboard_stats(p_company_id uuid,
 *                                            p_user_id uuid DEFAULT NULL,
 *                                            p_is_landlord boolean DEFAULT false)
 *   RETURNS jsonb  (LANGUAGE sql, STABLE, SECURITY DEFINER)
 *
 * Source: database/rpc_sources/propflow__get_enhanced_dashboard_stats.sql
 * Schema: database/turso_migrations/propflow__000_master_schema.sql
 *
 * Identity/tenancy comes from ctx, never from args:
 *   - p_company_id  -> ctx.companyId. The original's trailing
 *       `WHERE p_company_id = public.get_user_company_id() OR auth.role() = 'service_role'`
 *     makes the whole SELECT return zero rows (=> jsonb NULL) when the requested
 *     company is not the caller's. Reproduced: null when ctx.companyId is absent,
 *     or when args.p_company_id is supplied and disagrees with ctx.companyId.
 *     The service_role branch is unreachable from a user-scoped shim -> fail closed.
 *   - p_user_id     -> ctx.userId (profiles.id IS the auth uid). args.p_user_id is
 *     ignored so a browser cannot aim the landlord filter at another user's units.
 *   - p_is_landlord is a view toggle, not identity, so it is still read from args
 *     (SQL NULL there collapses to the same predicate as true — see below).
 */
export async function get_enhanced_dashboard_stats(
  client: Client,
  args: Record<string, unknown>,
  ctx: { userId: string; companyId: string | null }
): Promise<unknown> {
  // ---------- helpers (no imports allowed in this file) ----------
  const num = (v: unknown): number => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return v;
    if (typeof v === "bigint") return Number(v);
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  // Money is summed as integer cents in SQL, so the JSON carries exact 2-dp
  // values instead of binary-float artifacts (Postgres summed exact `numeric`).
  const money = (cents: unknown): number => Math.round(num(cents)) / 100;
  const parseJson = (v: unknown): unknown => {
    if (typeof v !== "string") return v;
    try {
      return JSON.parse(v);
    } catch {
      return v; // keep raw text rather than silently dropping data
    }
  };
  // Aggregates always yield exactly one row; ?? {} keeps this total anyway.
  const first = (res: { rows: unknown[] }): Record<string, unknown> =>
    (res.rows[0] ?? {}) as Record<string, unknown>;

  // ---------- tenancy gate (replaces the trailing WHERE) ----------
  const companyId = ctx.companyId;
  if (typeof companyId !== "string" || companyId.length === 0) {
    // get_user_company_id() IS NULL => `p_company_id = NULL` is never TRUE => no row.
    return null;
  }
  if (
    args.p_company_id !== undefined &&
    args.p_company_id !== null &&
    String(args.p_company_id) !== companyId
  ) {
    // Caller asked for a company that is not theirs => the original returned NULL.
    return null;
  }

  // ---------- p_is_landlord (DEFAULT false) ----------
  // Postgres predicate: (NOT p_is_landlord OR owner_id = p_user_id).
  // With p_is_landlord = NULL that is `NULL OR owner_id = p_user_id`, TRUE only
  // for owned rows — identical to p_is_landlord = true, so NULL maps to true.
  const rawIsLandlord = args.p_is_landlord;
  let isLandlord: boolean;
  if (rawIsLandlord === undefined) {
    isLandlord = false;
  } else if (rawIsLandlord === null) {
    isLandlord = true;
  } else if (typeof rawIsLandlord === "boolean") {
    isLandlord = rawIsLandlord;
  } else if (rawIsLandlord === "true" || rawIsLandlord === "t" || rawIsLandlord === 1) {
    isLandlord = true;
  } else if (rawIsLandlord === "false" || rawIsLandlord === "f" || rawIsLandlord === 0) {
    isLandlord = false;
  } else {
    throw new Error(
      `invalid input syntax for type boolean: "${String(rawIsLandlord)}"`
    );
  }
  const landlordFlag = isLandlord ? 1 : 0;
  const ownerId = ctx.userId;

  // ---------- clock (SQLite has no now()/current_date) ----------
  // Postgres now()/current_date run in the server TZ (UTC on Supabase); toISOString
  // is UTC too. Comparing ISO-8601 prefixes is exact and survives both
  // 'YYYY-MM-DD' dates and 'YYYY-MM-DDTHH:MM:SS.sssZ' timestamps in TEXT columns.
  const nowIso = new Date().toISOString();
  const monthPrefix = nowIso.slice(0, 7); // date_trunc('month', now())
  const todayPrefix = nowIso.slice(0, 10); // current_date

  // ---------- one read snapshot (batch is transactional in libsql), mirroring
  // ---------- the single STABLE SQL statement the original was ----------
  const [
    propsRes,
    appsRes,
    invRes,
    leaseRes,
    teamRes,
    areaRes,
    bldgRes,
    maintRes,
    showRes,
    actRes,
  ] = await client.batch(
    [
      {
        // totalProperties / availableProperties / rentedProperties carry the
        // landlord filter; occupancyRate in the original does NOT (it is
        // company-wide), so both variants are computed in one scan.
        sql: `SELECT
                COALESCE(SUM(CASE WHEN (? = 0 OR "owner_id" = ?) THEN 1 ELSE 0 END), 0) AS total_scoped,
                COALESCE(SUM(CASE WHEN (? = 0 OR "owner_id" = ?) AND "status" = 'available' THEN 1 ELSE 0 END), 0) AS available_scoped,
                COALESCE(SUM(CASE WHEN (? = 0 OR "owner_id" = ?) AND "status" = 'rented' THEN 1 ELSE 0 END), 0) AS rented_scoped,
                COUNT(*) AS total_all,
                COALESCE(SUM(CASE WHEN "status" = 'rented' THEN 1 ELSE 0 END), 0) AS rented_all
              FROM "properties"
              WHERE "company_id" = ?`,
        args: [
          landlordFlag,
          ownerId,
          landlordFlag,
          ownerId,
          landlordFlag,
          ownerId,
          companyId,
        ],
      },
      {
        sql: `SELECT
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN "status" IN ('new', 'pending', 'submitted', 'screening') THEN 1 ELSE 0 END), 0) AS pending
              FROM "applications"
              WHERE "company_id" = ?`,
        args: [companyId],
      },
      {
        // COALESCE(i.paid_at, i.updated_at) >= date_trunc('month', now())
        // becomes a 'YYYY-MM' prefix compare — same set, and independent of
        // whether the TEXT timestamp uses 'T' or ' ' as its separator.
        sql: `SELECT
                COALESCE(SUM(CASE WHEN substr(COALESCE("paid_at", "updated_at"), 1, 7) >= ?
                                  THEN CAST(ROUND(CAST("total" AS REAL) * 100) AS INTEGER) ELSE 0 END), 0) AS month_cents,
                COALESCE(SUM(CAST(ROUND(CAST("total" AS REAL) * 100) AS INTEGER)), 0) AS lifetime_cents
              FROM "invoices"
              WHERE "company_id" = ? AND "status" = 'paid'`,
        args: [monthPrefix, companyId],
      },
      {
        sql: `SELECT COALESCE(SUM(CAST(ROUND(CAST("rent_amount" AS REAL) * 100) AS INTEGER)), 0) AS rent_cents
              FROM "leases"
              WHERE "company_id" = ? AND lower("status") = 'active'`,
        args: [companyId],
      },
      {
        // profiles.is_active is boolean in Postgres, INTEGER 0/1 in SQLite.
        sql: `SELECT COUNT(*) AS c FROM "profiles" WHERE "company_id" = ? AND "is_active" = 1`,
        args: [companyId],
      },
      {
        sql: `SELECT COUNT(*) AS c FROM "areas" WHERE "company_id" = ?`,
        args: [companyId],
      },
      {
        sql: `SELECT COUNT(*) AS c FROM "buildings" WHERE "company_id" = ?`,
        args: [companyId],
      },
      {
        sql: `SELECT COUNT(*) AS c FROM "maintenance_requests"
              WHERE "company_id" = ? AND "status" NOT IN ('completed', 'cancelled')`,
        args: [companyId],
      },
      {
        // s.scheduled_date >= current_date, as a 'YYYY-MM-DD' prefix compare.
        sql: `SELECT COUNT(*) AS c FROM "showings"
              WHERE "company_id" = ? AND substr("scheduled_date", 1, 10) >= ?`,
        args: [companyId, todayPrefix],
      },
      {
        // jsonb_agg(row_to_json(recent)) over exactly these five columns.
        // created_at is NOT NULL, so no NULLS FIRST/LAST divergence applies.
        sql: `SELECT "id", "action", "entity_type", "details", "created_at"
              FROM "activity_log"
              WHERE "company_id" = ?
              ORDER BY "created_at" DESC
              LIMIT 20`,
        args: [companyId],
      },
    ],
    "read"
  );

  const p = first(propsRes);
  const a = first(appsRes);
  const i = first(invRes);
  const l = first(leaseRes);

  const totalAll = num(p.total_all);
  const rentedAll = num(p.rented_all);
  // round(100.0 * rented / total) — half away from zero; both operands are
  // non-negative here, so Math.round matches Postgres exactly.
  const occupancyRate = totalAll === 0 ? 0 : Math.round((100 * rentedAll) / totalAll);

  const recentActivity = actRes.rows.map((row) => {
    const r = row as unknown as Record<string, unknown>;
    return {
      id: r.id,
      action: r.action,
      entity_type: r.entity_type,
      details: parseJson(r.details), // jsonb in Postgres, TEXT in SQLite
      created_at: r.created_at,
    };
  });

  // RETURNS jsonb — a single object; supabase-js callers read it as { data }.
  return {
    totalProperties: num(p.total_scoped),
    availableProperties: num(p.available_scoped),
    rentedProperties: num(p.rented_scoped),
    totalApplications: num(a.total),
    pendingApplications: num(a.pending),
    totalMonthlyRevenue: money(i.month_cents),
    totalLifetimeRevenue: money(i.lifetime_cents),
    totalMonthlyRent: money(l.rent_cents),
    teamMembers: num(first(teamRes).c),
    totalAreas: num(first(areaRes).c),
    totalBuildings: num(first(bldgRes).c),
    openMaintenance: num(first(maintRes).c),
    upcomingShowings: num(first(showRes).c),
    occupancyRate,
    recentActivity,
  };
}
/**
 * Port of public.get_invitation_by_token(token_input text)
 *   RETURNS TABLE(id uuid, email text, role text, company_id uuid,
 *                 company_name text, company_logo_url text, status text)
 *   LANGUAGE sql STABLE SECURITY DEFINER
 *
 * Source: database/rpc_sources/propflow__get_invitation_by_token.sql
 * Schema: database/turso_migrations/propflow__000_master_schema.sql
 *
 * TENANT SCOPING — deliberate, do not "fix" without reading this:
 * the original has NO company predicate and is SECURITY DEFINER precisely so it
 * can bypass the `team_invitations_company_access` RLS policy
 * (`company_id = get_user_company_id()`, cmd ALL — rpc_sources/propflow__rls_policies.json
 * L331-337). An invitee is by definition not yet a member of the inviting
 * company — ctx.companyId is null or some OTHER company at the moment this is
 * called. Adding `ti.company_id = ctx.companyId` would return zero rows for
 * every legitimate invitee and kill the accept-invite flow.
 * The unguessable, UNIQUE `token` IS the capability here (team_invitations_token_key,
 * schema L947); the sibling RPC accept_invitation_manually is what performs the
 * privileged mutation, and it re-checks `auth.uid() IS NULL` plus
 * `lower(invite_record.email) <> lower(auth.email())` before touching anything.
 *
 * The join is FK-bound (c.id = ti.company_id) so it can only ever resolve the
 * invitation's own company — args cannot steer it at another tenant's row.
 *
 * REGISTRY NOTE: this is the first port using the 3-arg (client, args, ctx)
 * convention. The legacy `TURSO_RPC_SHIM` map in oasis-rpc-shim.ts is typed
 * `(client, args) => Promise<unknown>`; a 3-param function is NOT assignable to
 * that 2-param type, so widen the registry type before registering this.
 * Runtime is safe either way — ctx is never dereferenced here.
 */
export async function get_invitation_by_token(
  client: Client,
  args: Record<string, unknown>,
  ctx: { userId: string; companyId: string | null }
): Promise<unknown> {
  void ctx; // intentionally unused — see TENANT SCOPING above.

  // PostgREST rejects a call whose named arguments don't match the signature;
  // token_input has no DEFAULT, so an absent key is an error, not a null call.
  if (!("token_input" in args) || args.token_input === undefined) {
    throw new Error(
      'get_invitation_by_token: missing required argument "token_input"'
    );
  }
  // Explicit NULL is legal (`ti.token = NULL` is never true) and yields 0 rows,
  // exactly as in Postgres — passed straight through rather than special-cased.
  const tokenInput: string | null =
    args.token_input === null ? null : String(args.token_input);

  // now() is transaction-start time; this is a single statement, so one JS
  // timestamp is equivalent.
  //
  // EXPIRY COMPARISON — the assumption, stated honestly:
  // `expires_at` is TEXT NOT NULL with **no DEFAULT** (schema L838). The
  // Postgres default `(now() + '7 days'::interval)` was DROPPED by the
  // transpiler — see propflow__transpile_report.json → lossy.defaults_dropped.
  // So NOTHING IN THE SCHEMA ENFORCES THE STORED LAYOUT; the guarantee comes
  // from the write path instead: index.ts `toSql()` serializes Date via
  // `.toISOString()`, and all 89 surviving TEXT-timestamp defaults in this
  // schema use the same `%Y-%m-%dT%H:%M:%fZ` layout. Under that convention the
  // layout is fixed-width and byte-identical to Date#toISOString(), so
  // lexicographic `>` is chronological `>`.
  //
  // Known limits of raw text comparison, verified empirically — accepted, not
  // overlooked:
  //   * fail-OPEN on malformed data: `'garbage' > '2026-...Z'` is 1 in SQLite,
  //     so a non-ISO expires_at would never expire.
  //   * a value written in Postgres-dump layout ('2026-08-06 23:14:16+00')
  //     sorts below an ISO now on the same UTC day (' ' 0x20 < 'T' 0x54), so
  //     such a row would read as expired for its final ~24h.
  // Do NOT "harden" this with datetime(): SQLite returns NULL for a `+00`
  // offset (it requires `+00:00`), so it does not repair the drift case and it
  // truncates sub-seconds. An OR-both-layouts variant is strictly worse — it
  // fails OPEN, resurrecting same-day-expired ISO rows. If the layout ever
  // needs to be guaranteed, fix it at the write path or with a CHECK
  // constraint, not here.
  const nowIso = new Date().toISOString();

  const res = await client.execute({
    // Column list mirrors the RETURNS TABLE definition: c.name and c.logo_url
    // are aliased to company_name / company_logo_url, which is what the OUT
    // parameter names made PostgREST emit.
    sql: `SELECT ti."id"         AS "id",
                 ti."email"      AS "email",
                 ti."role"       AS "role",
                 ti."company_id" AS "company_id",
                 c."name"        AS "company_name",
                 c."logo_url"    AS "company_logo_url",
                 ti."status"     AS "status"
          FROM "team_invitations" ti
          JOIN "companies" c ON c."id" = ti."company_id"
          WHERE ti."token" = ?
            AND ti."status" = 'pending'
            AND ti."expires_at" > ?
          LIMIT 1`,
    args: [tokenInput, nowIso],
  });

  // RETURNS TABLE => set-returning => PostgREST hands supabase-js a JSON ARRAY
  // (0 or 1 elements here, since team_invitations.token is UNIQUE and the
  // original pins LIMIT 1). Callers using .single()/.maybeSingle() collapse it
  // client-side; the RPC itself must not.
  const OUT_COLUMNS = [
    "id",
    "email",
    "role",
    "company_id",
    "company_name",
    "company_logo_url",
    "status",
  ] as const;

  return res.rows.map((row) => {
    const src = row as unknown as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const col of OUT_COLUMNS) {
      // All seven are text/uuid in Postgres; nullable logo_url stays null.
      // Note: deliberately NOT routed through the package's fromSql(), which
      // JSON.parses any string starting with '{' or '[' — that would mangle a
      // company literally named "[Alpha]". None of these columns are jsonb.
      const v = src[col];
      out[col] = v === undefined || v === null ? null : String(v);
    }
    return out;
  });
}
/**
 * Port of public.get_platform_metrics() RETURNS jsonb
 *   LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
 *
 * Source: database/rpc_sources/propflow__get_platform_metrics.sql
 *   (identical to supabase/migrations/20260719000000_initial_schema.sql:1350-1364)
 * Schema: database/turso_migrations/propflow__000_master_schema.sql
 *
 *   SELECT CASE WHEN public.current_user_is_super_admin() THEN jsonb_build_object(
 *     'total_users',        (SELECT count(*) FROM public.profiles),
 *     'total_companies',    (SELECT count(*) FROM public.companies),
 *     'total_properties',   (SELECT count(*) FROM public.properties),
 *     'total_applications', (SELECT count(*) FROM public.applications)
 *   ) ELSE NULL END;
 *
 * The helper is the entire security model. It is not in rpc_sources; its live
 * definition is initial_schema.sql:114 — defined once, never redefined:
 *   SELECT EXISTS (SELECT 1 FROM public.profiles
 *                  WHERE id = auth.uid() AND is_active AND is_super_admin)
 * BOTH flags are required: a deactivated super admin is denied.
 *
 * TENANT SCOPE: the original has no company predicate — it is the platform-operator
 * census across every tenant. That absence is preserved exactly. Scoping this to
 * ctx.companyId would silently turn a platform metric into a per-company one and
 * break the super-admin dashboard. Consequence: the is_active + is_super_admin gate
 * is the ONLY boundary between a caller and a global row count. It must never be
 * relaxed, and must never be driven by anything the browser can set.
 */
export async function get_platform_metrics(
  client: Client,
  args: Record<string, unknown>,
  ctx: { userId: string; companyId: string | null }
): Promise<unknown> {
  // Identity comes only from ctx. `args` is browser-controlled and this RPC takes
  // no inputs, so it is deliberately never read — args={is_super_admin:true} has
  // nowhere to land.
  void args;

  // Typed as required, but guarded at runtime: a shim that forgets to pass ctx, or
  // passes a non-string, must fail closed the way auth.uid() IS NULL does rather
  // than throw out of the libsql arg binder. Matches the convention already used by
  // get_portal_logs in this file.
  const callerId =
    typeof ctx?.userId === "string" && ctx.userId.length > 0 ? ctx.userId : null;

  if (callerId === null) {
    // auth.uid() IS NULL -> EXISTS(...) is false -> the original returns NULL.
    return null;
  }

  // ONE statement, matching the original's single STABLE evaluation: the gate and
  // the four counts share a single read snapshot, so a caller cannot be authorized
  // against one snapshot and counted against another.
  //
  // Measured, not assumed: SQLite DOES short-circuit CASE/THEN. Instrumenting the
  // THEN branch with a counting UDF gives 0 row evaluations for a denied caller and
  // N for an authorized one — so the unauthorized path costs one primary-key lookup,
  // not four table scans. (The earlier two-statement split was justified by the
  // opposite claim, which is false.)
  //
  // Both flags are Postgres booleans transpiled to INTEGER (schema lines 659, 662)
  // and etl_supabase_to_turso.py writes bool as 0/1, so `= 1` is exact over the
  // whole domain; INTEGER affinity also coerces a stray TEXT '1' to integer 1.
  const rs = await client.execute({
    sql:
      'WITH gate(ok) AS (' +
      '  SELECT EXISTS (' +
      '    SELECT 1 FROM "profiles"' +
      '    WHERE "id" = ? AND "is_active" = 1 AND "is_super_admin" = 1' +
      "  )" +
      ") " +
      "SELECT gate.ok AS authorized, " +
      '  CASE WHEN gate.ok THEN (SELECT count(*) FROM "profiles")     END AS total_users, ' +
      '  CASE WHEN gate.ok THEN (SELECT count(*) FROM "companies")    END AS total_companies, ' +
      '  CASE WHEN gate.ok THEN (SELECT count(*) FROM "properties")   END AS total_properties, ' +
      '  CASE WHEN gate.ok THEN (SELECT count(*) FROM "applications") END AS total_applications ' +
      "FROM gate",
    args: [callerId],
  });

  const row = rs.rows[0];
  if (!row) {
    // Unreachable: a scalar-aggregate SELECT over a one-row CTE always yields a row.
    // Kept as a loud failure — returning null here would masquerade as "not
    // authorized" and hide a real fault.
    throw new Error("get_platform_metrics: gated metrics query returned no row");
  }

  // EXISTS yields integer 0/1; libsql may hand it back as number or bigint.
  if (Number(row.authorized) !== 1) {
    // Not a super admin, or deactivated: the original's CASE falls through to
    // ELSE NULL. It does not raise. Preserve that — do not invent a thrown error.
    return null;
  }

  // count(*) arrives as number | bigint | string depending on the client's intMode;
  // Number() normalizes so the JSON never carries a bigint (JSON.stringify throws).
  const toCount = (v: unknown): number =>
    v === null || v === undefined ? 0 : Number(v);

  // jsonb_build_object(...) -> a plain JSON object; supabase-js callers read this
  // straight out of { data }.
  return {
    total_users: toCount(row.total_users),
    total_companies: toCount(row.total_companies),
    total_properties: toCount(row.total_properties),
    total_applications: toCount(row.total_applications),
  };
}
/**
 * Port of public.increment_automation_counter(config_id uuid, is_success boolean)
 *   RETURNS void  (SECURITY DEFINER, search_path=public)
 *
 * Source: database/rpc_sources/propflow__increment_automation_counter.sql
 * Schema: database/turso_migrations/propflow__000_master_schema.sql:199-215
 *
 *   UPDATE public.automation_configs
 *      SET total_executions = total_executions + 1,
 *          successful_executions = successful_executions + CASE WHEN is_success THEN 1 ELSE 0 END,
 *          last_execution_at = now(), updated_at = now()
 *    WHERE id = config_id
 *      AND (company_id = public.get_user_company_id() OR auth.role() = 'service_role');
 *
 * BEHAVIOR CHANGE (deliberate, must be confirmed by the wiring agent):
 * the `auth.role() = 'service_role'` disjunct is DROPPED. This shim is reached
 * only on an authenticated end-user call and ctx carries no role, so an OR-bypass
 * here would be browser-reachable and defeat tenant isolation. Any server-side
 * caller (automation runner, cron, webhook) that relied on the bypass to bump a
 * config outside its own company MUST get a separate server-only path — routing
 * it through this shim now updates 0 rows and returns null with NO error.
 */
export async function increment_automation_counter(
  client: Client,
  args: Record<string, unknown>,
  ctx: { userId: string; companyId: string | null },
): Promise<unknown> {
  const FN = 'increment_automation_counter';
  const a = args ?? {};

  // --- PostgREST signature parity -----------------------------------------
  // Neither parameter has a DEFAULT, so PostgREST cannot resolve the overload
  // when one is absent (PGRST202) and NOTHING is written. An omitted argument
  // is therefore an error, not a NULL — a typo'd `is_sucess` must not silently
  // bump total_executions and record the run as a failure.
  if (!('config_id' in a)) {
    throw new Error(`${FN}: missing required argument "config_id"`);
  }
  if (!('is_success' in a)) {
    throw new Error(`${FN}: missing required argument "is_success"`);
  }

  // --- config_id (browser-controlled: identity/company are NEVER read from args) ---
  // An explicit SQL NULL is legal input: `WHERE id = NULL` is never true, so the
  // original matched 0 rows and still returned void. No write, no error.
  const rawConfigId = a.config_id;
  if (rawConfigId === null || rawConfigId === undefined) {
    return null;
  }
  // uuid parity: Postgres rejects a malformed uuid (22P02) rather than matching
  // nothing, and normalizes `A1B2…`/`{…}`/`urn:uuid:…` to canonical lowercase.
  // SQLite stores ids as TEXT and `=` is case-sensitive, so an uppercase uuid
  // that matched in Postgres would silently match 0 rows here without this.
  const configId = normalizeUuidArg(rawConfigId, 'config_id', FN);

  // --- is_success: Postgres boolean-input parity ---------------------------
  // Explicit SQL NULL flows to the `CASE … ELSE 0` branch, so null => 0 and
  // total_executions still increments. Anything not boolean-coercible errors,
  // matching Postgres "invalid input syntax for type boolean" rather than being
  // silently counted as a failure.
  const rawIsSuccess = a.is_success;
  let successIncrement: number;
  if (rawIsSuccess === null || rawIsSuccess === undefined) {
    successIncrement = 0;
  } else if (typeof rawIsSuccess === 'boolean') {
    successIncrement = rawIsSuccess ? 1 : 0;
  } else if (
    typeof rawIsSuccess === 'number' &&
    (rawIsSuccess === 0 || rawIsSuccess === 1)
  ) {
    successIncrement = rawIsSuccess === 1 ? 1 : 0;
  } else if (typeof rawIsSuccess === 'string') {
    // Postgres accepts true/false, t/f, yes/no, y/n, on/off, 1/0 and any unique
    // prefix of those words, case-insensitively, with surrounding whitespace.
    const v = rawIsSuccess.trim().toLowerCase();
    if (['t', 'tr', 'tru', 'true', 'y', 'ye', 'yes', 'on', '1'].includes(v)) {
      successIncrement = 1;
    } else if (
      ['f', 'fa', 'fal', 'fals', 'false', 'n', 'no', 'of', 'off', '0'].includes(v)
    ) {
      successIncrement = 0;
    } else {
      throw new Error(
        `${FN}: invalid input syntax for type boolean: "${rawIsSuccess}"`,
      );
    }
  } else {
    throw new Error(
      `${FN}: invalid input syntax for type boolean: "${String(rawIsSuccess)}"`,
    );
  }

  // --- tenant scope: from ctx only, never from args ------------------------
  // A missing ctx is a dispatcher wiring bug, not a tenantless user: fail loud
  // instead of silently no-op'ing every counter update in production.
  if (ctx === null || ctx === undefined) {
    throw new Error(
      `${FN}: missing tenant context (ctx.companyId) — dispatcher must pass ctx`,
    );
  }
  // A caller with no company matches no row, exactly as `company_id = NULL` did.
  if (
    ctx.companyId === null ||
    ctx.companyId === undefined ||
    ctx.companyId === ''
  ) {
    return null;
  }

  // One timestamp for both columns, mirroring now() being a single transaction
  // timestamp. Format matches the schema default strftime('%Y-%m-%dT%H:%M:%fZ').
  const nowIso = new Date().toISOString();

  // Single atomic UPDATE. Both counters are incremented by the engine relative
  // to the stored value (never read-modify-write in JS), so concurrent
  // executions of the same config cannot clobber each other's increments.
  await client.execute({
    sql: `UPDATE automation_configs
             SET total_executions = total_executions + 1,
                 successful_executions = successful_executions + ?,
                 last_execution_at = ?,
                 updated_at = ?
           WHERE id = ?
             AND company_id = ?`,
    args: [successIncrement, nowIso, nowIso, configId, ctx.companyId],
  });

  // RETURNS void -> supabase-js callers read { data: null }.
  // A non-existent or other-company config_id updated 0 rows and still returned
  // void, so this stays null rather than throwing.
  return null;
}

/** Postgres uuid input parity: validate, unwrap {…}/urn:uuid:, canonical-lowercase. */
function normalizeUuidArg(raw: unknown, argName: string, fnName: string): string {
  if (typeof raw !== 'string') {
    throw new Error(
      `${fnName}: invalid input syntax for type uuid (${argName}): "${String(raw)}"`,
    );
  }
  let v = raw.trim();
  if (v.startsWith('{') && v.endsWith('}')) v = v.slice(1, -1);
  if (v.toLowerCase().startsWith('urn:uuid:')) v = v.slice(9);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  ) {
    throw new Error(
      `${fnName}: invalid input syntax for type uuid (${argName}): "${raw}"`,
    );
  }
  return v.toLowerCase();
}
/**
 * Port of public.reap_stale_walkthrough_jobs()
 *   RETURNS TABLE(job_id uuid, prev_status text, age_minutes integer)
 *   LANGUAGE plpgsql SECURITY DEFINER
 *
 * Source: database/rpc_sources/propflow__reap_stale_walkthrough_jobs.sql
 * Schema: database/turso_migrations/propflow__000_master_schema.sql
 *         walkthrough_jobs(id, company_id, property_id, created_by, status,
 *         photo_count, runpod_job_id, error_message, progress_pct, share_token,
 *         splat_r2_key, preview_r2_key, splat_size_bytes, started_at,
 *         completed_at, created_at, updated_at) — all timestamps ISO-8601 TEXT.
 *
 * TENANT DEVIATION (deliberate, documented): the PL/pgSQL is SECURITY DEFINER and
 * carries NO company predicate — it reaps every company's stale jobs in one call.
 * Over libsql there is no RLS backstop, and this shim is reachable from a browser
 * session, so the reap is constrained to ctx.companyId, matching the table's RLS
 * policy walkthrough_jobs_company_access (company_id = get_user_company_id()).
 * A cross-tenant sweep must run as a server-side job that iterates companies.
 *
 * WIRING NOTE: this takes a third `ctx` parameter, so it is NOT assignable to the
 * current TURSO_RPC_SHIM registry type in oasis-rpc-shim.ts
 * (`(client, args) => Promise<unknown>`). Widen that registry to a ctx-aware
 * signature in the same change — dispatched through the narrow type, `ctx` would
 * arrive `undefined` and this function would throw a TypeError on `ctx.companyId`
 * instead of its intended error. Identity must reach this function through `ctx`
 * only; do NOT adopt the sibling `args.auth_uid` injection convention used by
 * get_portal_logs, because the zero-arg guard below rejects any key in `args`.
 */
export async function reap_stale_walkthrough_jobs(
  client: Client,
  args: Record<string, unknown>,
  ctx: { userId: string; companyId: string | null }
): Promise<unknown> {
  // The Postgres signature takes zero arguments. PostgREST rejects an RPC call
  // whose named arguments don't match a signature (PGRST202) — mirror that
  // rather than silently ignoring input, so an attempt to smuggle company_id /
  // auth_uid through args fails loudly instead of looking accepted-and-ignored.
  const argKeys = args ? Object.keys(args) : [];
  if (argKeys.length > 0) {
    throw new Error(
      `Could not find the function public.reap_stale_walkthrough_jobs(${argKeys
        .sort()
        .join(", ")}) in the schema cache`
    );
  }

  // Identity comes from ctx only — never from args (a browser controls args).
  // ctx.userId is unused: the source never calls auth.uid(); it is SECURITY
  // DEFINER and authorizes nothing. Tenancy is the whole authorization story here.
  const companyId = ctx?.companyId;
  if (typeof companyId !== "string" || companyId.length === 0) {
    throw new Error(
      "reap_stale_walkthrough_jobs: no company in caller context; refusing to reap walkthrough jobs across tenants"
    );
  }

  // now() is stable for the whole PL/pgSQL statement — pin one instant in JS and
  // reuse it for the cutoff, the age arithmetic and the written timestamps.
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const cutoffIso = new Date(nowMs - 60 * 60 * 1000).toISOString(); // now() - interval '1 hour'

  // --- the `stale` CTE ---------------------------------------------------
  // Timestamps are compared through julianday() rather than lexicographically:
  // ETL-migrated rows carry PostgREST's '...T12:00:00.123456+00:00' while rows
  // written by SQLite defaults / this shim carry '...T12:00:00.123Z'. julianday()
  // parses both (verified: both yield 2461258.0000014235); a string compare does
  // not — '...123456+00:00' sorts BEFORE '...123Z' on the '4' vs 'Z' byte. An
  // unparseable timestamp yields NULL, the predicate is not TRUE, and the row is
  // left alone — a reaper that writes 'failed' must fail closed, never guess.
  //
  // age: extract(epoch FROM (now() - COALESCE(started_at, created_at)))::integer / 60
  // Postgres rounds the epoch to integer seconds FIRST (half away from zero),
  // then integer-divides by 60 (truncating toward zero, which SQLite matches for
  // negatives too: -90/60 = -1 in both).
  //
  // The inner ROUND(..., 3) is load-bearing, not cosmetic. julianday() returns a
  // double near 2.46e6, so differencing two of them carries ~3e-5 s of error.
  // That error only matters when the true age is exactly N*60 - 0.5 s — the one
  // place a sub-second slip crosses a minute bucket. Without the snap it slips the
  // wrong way on 16973 of the 20099 reachable half-second ages (84.4%), each
  // reporting one minute LESS than Postgres: e.g. started_at 11:57:00.500Z with
  // now 13:00:00.000Z is 3779.5 s, which Postgres reports as 63 and the unsnapped
  // expression as 62. Every stored timestamp is millisecond-precision, so snapping
  // to 3 decimals recovers the exact value before the half-away-from-zero round.
  // Measured after the snap: 0/20099 disagreements on the boundary and 0/18000 off
  // it. age_minutes is a reported field only — it never gates the reap — so this is
  // payload fidelity, not a change in which rows are failed.
  const AGE_MINUTES_EXPR = `CAST(ROUND(ROUND((julianday(?) - julianday(COALESCE("started_at", "created_at"))) * 86400.0, 3)) AS INTEGER) / 60`;

  const snapshot = await client.execute({
    sql: `SELECT "id", "status", ${AGE_MINUTES_EXPR} AS "age_minutes"
            FROM "walkthrough_jobs"
           WHERE "company_id" = ?
             AND "status" IN ('uploading', 'queued', 'training')
             AND julianday(COALESCE("started_at", "created_at")) < julianday(?)`,
    // Parameter order follows SQL text order: select-list, then WHERE.
    args: [nowIso, companyId, cutoffIso],
  });

  type Candidate = { id: string; status: string; age: number };
  const candidates: Candidate[] = snapshot.rows.map((row) => {
    const r = row as unknown as Record<string, unknown>;
    return {
      id: String(r.id),
      status: String(r.status),
      age: Number(r.age_minutes),
    };
  });

  // The PL/pgSQL returns an empty set when nothing is stale; skip the write.
  // Load-bearing, not defensive: falling through with zero candidates would build
  // an empty OR-chain and SQLite would reject it with `near ")": syntax error`.
  if (candidates.length === 0) return [];

  // --- the `updated` CTE, as a per-row compare-and-swap ------------------
  // FOR UPDATE has no libsql equivalent, so each row is re-qualified inside the
  // UPDATE by (id, status) — the exact status observed in the snapshot. SQLite
  // admits one writer at a time, so a row can only be claimed once: whoever runs
  // second finds status = 'failed' (or whatever a worker advanced it to), the
  // pair no longer matches, and it is absent from RETURNING. That both prevents
  // double-reaping under concurrent reapers and prevents clobbering a job that
  // legitimately finished between the SELECT and the UPDATE. Re-checking the age
  // predicate additionally protects a job whose worker reset started_at to retry.
  // Accepted divergence: a job that moved queued→training inside the race window
  // is skipped here, where Postgres's FOR UPDATE re-check would still reap it.
  // It is reaped on the next run, and pairing on status is what keeps prev_status
  // from ever being a lie.
  // Chunked so the bound-parameter count stays well inside SQLite's limit (200
  // pairs = 404 params, verified to bind); the chunks go through one
  // batch(..., "write"), which is a single transaction, so the whole reap commits
  // or none of it does — matching the single-statement original.
  const CHUNK = 200;
  // Typed string[] (not unknown[]): libsql's InStatement requires InValue[], and
  // unknown[] is not assignable to it under strict TS. Every bound value here is
  // a string, so this is the precise type, not a cast.
  const statements: Array<{ sql: string; args: string[] }> = [];
  for (let i = 0; i < candidates.length; i += CHUNK) {
    const chunk = candidates.slice(i, i + CHUNK);
    const pairs = chunk.map(() => `("id" = ? AND "status" = ?)`).join(" OR ");
    const params: string[] = [nowIso, nowIso, companyId];
    for (const c of chunk) params.push(c.id, c.status);
    params.push(cutoffIso);
    statements.push({
      // The OR-chain is parenthesised as a group so it cannot absorb the
      // company_id / age predicates through AND-binds-tighter precedence.
      sql: `UPDATE "walkthrough_jobs"
               SET "status" = 'failed',
                   "error_message" = COALESCE("error_message", 'Walkthrough job timed out'),
                   "completed_at" = ?,
                   "updated_at" = ?
             WHERE "company_id" = ?
               AND (${pairs})
               AND julianday(COALESCE("started_at", "created_at")) < julianday(?)
         RETURNING "id"`,
      args: params,
    });
  }

  const results = await client.batch(statements, "write");

  const claimed = new Set<string>();
  for (const res of results) {
    for (const row of res.rows) {
      const r = row as unknown as Record<string, unknown>;
      claimed.add(String(r.id));
    }
  }

  // RETURNS TABLE(job_id, prev_status, age_minutes) → PostgREST hands supabase-js
  // a JSON array of objects; { data: [] } when nothing was stale. Only rows the
  // UPDATE actually claimed are reported, and prev_status/age_minutes are the
  // pre-update values the CAS just re-confirmed (matching the PL/pgSQL, which
  // returns s.status / s.age from the pre-update `stale` CTE, not the post-update
  // row — so reading them out of RETURNING would have been wrong).
  return candidates
    .filter((c) => claimed.has(c.id))
    .map((c) => ({
      job_id: c.id,
      prev_status: c.status,
      age_minutes: c.age,
    }));
}
export async function register_incoming_webhook_event(
  client: Client,
  args: Record<string, unknown>,
  ctx: { userId: string; companyId: string | null },
): Promise<unknown> {
  // This table is a GLOBAL webhook-dedup ledger: the target schema defines no
  // company_id/user_id column, and the source RPC (SECURITY DEFINER) never
  // referenced auth.uid(). There is therefore no tenant predicate to preserve,
  // and no join that could read across companies. ctx is deliberately unused
  // rather than fabricated into a filter no column supports.
  void ctx;

  // PostgREST hands a `text` RPC parameter the ->> rendering of the JSON value,
  // so a JSON number arrives at Postgres as text ("4815162342" is a perfectly
  // ordinary provider event id). Mirror that for numeric scalars; keep rejecting
  // objects/arrays/booleans, which are never legitimate identities and whose
  // JSON rendering would poison the dedup ledger with rows like "true".
  const asText = (value: unknown): string | null => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'bigint') return String(value);
    return null;
  };

  // Postgres btrim(text) strips ASCII spaces only (not tabs/newlines) — matched
  // exactly so the accept/reject boundary is identical to the original.
  const isBlankIdentity = (value: string | null): boolean =>
    value === null || value.replace(/^ +| +$/g, '') === '';

  const provider = asText(args.p_provider);
  const eventId = asText(args.p_event_id);

  if (isBlankIdentity(provider) || isBlankIdentity(eventId)) {
    throw new Error('Invalid webhook identity');
  }

  // Insert the RAW values, untrimmed: the original validates on btrim() but
  // stores p_provider/p_event_id verbatim. Trimming here would collapse two
  // distinct dedup identities into one.
  const payloadHash = asText(args.p_payload_hash);

  // greatest(coalesce(p_ttl_seconds, 86400), 60)
  //
  // Only a real number or a numerically-parsable string counts as "supplied".
  // Bare Number() coercion would turn "", false and [] into 0, which the 60s
  // floor then silently converts into a 60-second replay window instead of a
  // day — Postgres rejects those at the integer cast, so falling back to the
  // 86400 default keeps dedup strong rather than quietly weakening it.
  let ttlSeconds = 86400;
  const rawTtl = args.p_ttl_seconds;
  if (typeof rawTtl === 'number' && Number.isFinite(rawTtl)) {
    ttlSeconds = rawTtl;
  } else if (typeof rawTtl === 'bigint') {
    ttlSeconds = Number(rawTtl);
  } else if (typeof rawTtl === 'string' && rawTtl.trim() !== '') {
    const parsed = Number(rawTtl);
    if (Number.isFinite(parsed)) ttlSeconds = parsed;
  }
  // Postgres rounds (not truncates) numeric -> integer on the parameter cast.
  ttlSeconds = Math.round(ttlSeconds);
  ttlSeconds = Math.max(ttlSeconds, 60);
  // Postgres rejects anything past int4 for an integer parameter; clamping here
  // also keeps the Date below in range instead of throwing on an Invalid Date.
  ttlSeconds = Math.min(ttlSeconds, 2147483647);

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

  // Single transactional batch mirrors the PL/pgSQL function body (sweep then
  // claim). The uniqueness decision itself is made by SQLite against the
  // "incoming_webhook_events_provider_event_id_key" unique index, so two racing
  // callers cannot both observe rowsAffected === 1. Verified in real SQLite that
  // the preceding DELETE does not contaminate the INSERT's per-statement count.
  const results = await client.batch(
    [
      {
        sql: 'DELETE FROM "incoming_webhook_events" WHERE "expires_at" < ?',
        args: [nowIso],
      },
      {
        sql:
          'INSERT INTO "incoming_webhook_events" ' +
          '("id", "provider", "event_id", "payload_hash", "processed_at", "expires_at", "created_at", "updated_at") ' +
          'VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
          'ON CONFLICT ("provider", "event_id") DO NOTHING',
        args: [
          crypto.randomUUID(),
          provider,
          eventId,
          payloadHash,
          nowIso,
          expiresAt,
          nowIso,
          nowIso,
        ],
      },
    ],
    'write',
  );

  // Original returns a scalar boolean (GET DIAGNOSTICS ROW_COUNT = 1).
  return Number(results[1].rowsAffected) === 1;
}

/**
 * MANIFEST
 *   accept_invitation_manually       verified  writes=True  scoped=True  confidence=high
 *   check_rate_limit                 verified  writes=True  scoped=False  confidence=high
 *   count_active_walkthroughs        verified  writes=False  scoped=True  confidence=high
 *   ensure_user_profile              verified  writes=True  scoped=True  confidence=high
 *   ensure_user_profile_admin        verified  writes=True  scoped=True  confidence=high
 *   generate_invoice_number          verified  writes=True  scoped=True  confidence=high
 *   get_enhanced_dashboard_stats     ported-unverified  writes=False  scoped=True  confidence=high
 *   get_invitation_by_token          verified  writes=False  scoped=False  confidence=high
 *   get_platform_metrics             verified  writes=False  scoped=True  confidence=high
 *   increment_automation_counter     verified  writes=True  scoped=True  confidence=high
 *   reap_stale_walkthrough_jobs      verified  writes=True  scoped=True  confidence=high
 *   register_incoming_webhook_event  verified  writes=True  scoped=False  confidence=high
 */
export const PROPFLOW_RPC: Record<string, RpcFn> = {
  accept_invitation_manually,
  check_rate_limit,
  count_active_walkthroughs,
  ensure_user_profile,
  ensure_user_profile_admin,
  generate_invoice_number,
  get_enhanced_dashboard_stats,
  get_invitation_by_token,
  get_platform_metrics,
  increment_automation_counter,
  reap_stale_walkthrough_jobs,
  register_incoming_webhook_event,
};
