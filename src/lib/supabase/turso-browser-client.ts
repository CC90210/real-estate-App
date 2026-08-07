"use client";
/**
 * Browser client that speaks supabase-js's dialect but ships every query to
 * /api/data/bridge instead of straight to a database.
 *
 * WHY THIS SHAPE. PropFlow has ~83 browser files querying tables directly, with
 * RLS as the only authorization boundary. A Turso token is a FULL-database
 * credential and can never reach a browser, so the queries must terminate
 * server-side. Rewriting 83 files is weeks of risk; instead the builder here
 * accumulates a query *spec* and POSTs it, and the bridge re-applies the RLS
 * guarantees (identity from the session cookie, forced company/user scoping,
 * deny-by-default for unmapped tables). Call sites keep their exact API.
 *
 * Deliberately NOT here: any @libsql/client import (browser bundle), any
 * credential, any scoping logic. Scoping decisions belong ONLY to the bridge —
 * a filter added here could be edited by any user in devtools.
 */

import { createBrowserClient } from "@supabase/ssr";

type Json = Record<string, unknown>;

interface FilterSpec { method: string; args: unknown[] }

interface QuerySpec {
  table: string;
  action: "select" | "insert" | "update" | "upsert" | "delete";
  columns?: string;
  count?: "exact" | "estimated";
  head?: boolean;
  filters: FilterSpec[];
  order: { column: string; ascending?: boolean }[];
  limit?: number;
  range?: [number, number];
  single?: "single" | "maybe";
  values?: Json | Json[];
  onConflict?: string;
  returning?: boolean;
}

export interface BridgeResponse<T = unknown> {
  data: T | null;
  error: { message: string; code?: string; details?: string | null; hint?: string | null } | null;
  count?: number | null;
}

const FILTER_METHODS = [
  "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in",
  "contains", "not", "or", "match", "filter",
] as const;

class BridgeQuery implements PromiseLike<BridgeResponse> {
  private spec: QuerySpec;
  private signal?: AbortSignal;

  constructor(table: string) {
    this.spec = { table, action: "select", filters: [], order: [] };
    for (const m of FILTER_METHODS) {
      // Chainable filter methods — recorded, never interpreted client-side.
      (this as unknown as Json)[m] = (...args: unknown[]) => {
        this.spec.filters.push({ method: m, args });
        return this;
      };
    }
  }

  select(columns = "*", opts?: { count?: "exact" | "estimated"; head?: boolean }) {
    if (this.spec.action === "select") this.spec.columns = columns;
    else this.spec.returning = true;
    if (opts?.count) this.spec.count = opts.count;
    if (opts?.head) this.spec.head = opts.head;
    return this;
  }
  insert(values: Json | Json[]) {
    this.spec.action = "insert";
    this.spec.values = values;
    return this;
  }
  upsert(values: Json | Json[], opts?: { onConflict?: string }) {
    this.spec.action = "upsert";
    this.spec.values = values;
    this.spec.onConflict = opts?.onConflict;
    return this;
  }
  update(values: Json) {
    this.spec.action = "update";
    this.spec.values = values;
    return this;
  }
  delete() {
    this.spec.action = "delete";
    return this;
  }
  order(column: string, opts?: { ascending?: boolean }) {
    this.spec.order.push({ column, ascending: opts?.ascending });
    return this;
  }
  limit(n: number) {
    this.spec.limit = n;
    return this;
  }
  range(from: number, to: number) {
    this.spec.range = [from, to];
    return this;
  }
  single() {
    this.spec.single = "single";
    return this;
  }
  maybeSingle() {
    this.spec.single = "maybe";
    return this;
  }
  /** supabase-js API compat — errors are already returned, never thrown. */
  throwOnError() {
    return this;
  }

  /** Real cancellation: the signal is forwarded to the bridge fetch, so an
   *  aborted request actually aborts (useUser.tsx relies on this to cancel
   *  in-flight profile loads on unmount). */
  abortSignal(signal: AbortSignal) {
    this.signal = signal;
    return this;
  }

  then<R1 = BridgeResponse, R2 = never>(
    onfulfilled?: ((v: BridgeResponse) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private async run(): Promise<BridgeResponse> {
    try {
      const res = await fetch("/api/data/bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(this.spec),
        signal: this.signal,
      });
      const body = (await res.json()) as BridgeResponse;
      return body;
    } catch (e) {
      return {
        data: null,
        count: null,
        error: {
          message: e instanceof Error ? e.message : "network error",
          code: "BRIDGE_UNREACHABLE",
        },
      };
    }
  }
}

/** Lazily-built real Supabase browser client, used ONLY for storage (files did
 *  not migrate — Turso is a database, not an object store). Kept out of the
 *  auth/data paths entirely. */
let _storageClient: ReturnType<typeof createBrowserClient> | null = null;
function supabaseStorageClient() {
  if (!_storageClient) {
    _storageClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _storageClient;
}

async function meRequest(): Promise<{ id: string; email: string } | null> {
  try {
    const r = await fetch("/api/auth/turso-me", { credentials: "include" });
    if (!r.ok) return null;
    const b = (await r.json()) as { user: { id: string; email: string } | null };
    return b.user;
  } catch {
    return null;
  }
}

export function createTursoBrowserClient() {
  return {
    // `any` is deliberate and load-bearing: the filter methods are installed
    // dynamically in the constructor, so the class type cannot express them.
    // Call sites are existing supabase-js code that already type-checks
    // against SupabaseClient at the factory boundary in client.ts.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from(table: string): any {
      return new BridgeQuery(table);
    },

    auth: {
      async getUser() {
        const user = await meRequest();
        return { data: { user }, error: null };
      },
      async getSession() {
        const user = await meRequest();
        return { data: { session: user ? { user } : null }, error: null };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const r = await fetch("/api/auth/turso-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });
        if (!r.ok) {
          return {
            data: { user: null, session: null },
            error: {
              message: r.status === 429
                ? "Too many attempts — wait a few minutes."
                : "Invalid email or password.",
            },
          };
        }
        const b = (await r.json()) as { user?: { id: string; email: string } };
        return { data: { user: b.user ?? { email }, session: { user: b.user } }, error: null };
      },
      async signUp() {
        // Creating a Supabase auth user here would be invisible to Turso login
        // — a stranded account. Same gate as the other migrated apps.
        return {
          data: { user: null, session: null },
          error: { message: "New signups are temporarily paused for maintenance." },
        };
      },
      async signOut() {
        await fetch("/api/auth/turso-me", { method: "DELETE", credentials: "include" })
          .catch(() => null);
        return { error: null };
      },
      onAuthStateChange() {
        // No client-side session machinery to subscribe to — the HttpOnly
        // cookie is the session, and components re-read it via getUser().
        return { data: { subscription: { unsubscribe() { /* no-op */ } } } };
      },
    },

    // Realtime has no Turso equivalent; components fall back to their polling
    // paths. Chainable no-ops keep existing call sites from throwing.
    channel() {
      const ch = {
        on() { return ch; },
        subscribe() { return ch; },
        unsubscribe() { return ch; },
      };
      return ch;
    },
    removeChannel() { /* no-op */ },

    /** Ported PL/pgSQL, executed by /api/data/rpc with the caller's scope
     *  resolved server-side. Unported names come back as a loud error rather
     *  than a silent no-op. */
    async rpc(name: string, args?: Json) {
      try {
        const r = await fetch("/api/data/rpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name, args: args ?? {} }),
        });
        return (await r.json()) as BridgeResponse;
      } catch (e) {
        return {
          data: null,
          error: {
            message: e instanceof Error ? e.message : "network error",
            code: "BRIDGE_UNREACHABLE",
          },
        } as BridgeResponse;
      }
    },

    /** Storage. A Turso database is not an object store, so objects live in R2.
     *
     *  Only getPublicUrl is served here, and only when NEXT_PUBLIC_R2_PUBLIC_BASE_URL
     *  is set — it is pure string construction, needs no credentials, and is the
     *  one storage call this app makes from the browser. Everything else falls
     *  through to the real Supabase storage client, which is also the rollback.
     *
     *  Writes deliberately do NOT route to R2 from the browser: that would mean
     *  shipping an R2 key to the client. Uploads belong on the server adapter
     *  (src/lib/supabase/r2-storage.ts), reached through the server factories. */
    get storage() {
      const base = (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
      if (!base) return supabaseStorageClient().storage;
      const real = supabaseStorageClient().storage;
      return {
        ...real,
        from(bucket: string) {
          const realBucket = real.from(bucket);
          return {
            ...realBucket,
            getPublicUrl(path: string) {
              // Same <bucket>/<path> key convention etl_storage_to_r2.py
              // uploads with, so migrated objects resolve unchanged.
              return {
                data: {
                  publicUrl: `${base}/${bucket}/${String(path).replace(/^\/+/, "")}`,
                },
              };
            },
          };
        },
      } as unknown as ReturnType<typeof supabaseStorageClient>["storage"];
    },
  };
}
