/**
 * Per-instance sliding-window limiter for the Turso auth routes.
 *
 * WHY NOT `@/lib/rate-limit`: that one calls the `check_rate_limit` RPC through
 * the Supabase admin client. These routes have to keep working with Supabase
 * COMPLETELY ABSENT, so they cannot depend on it — and an auth route that
 * degrades to "no limit" because its limiter's backend is gone is exactly the
 * failure this migration must not ship.
 *
 * Scope is deliberate: this stops bcrypt from being used as an oracle and stops
 * reset-mail flooding from a single source. Distributed rate limiting and DDoS
 * defense belong to the platform WAF, same division of labour as
 * /api/auth/turso-login.
 */

const BUCKETS = new Map<string, number[]>();

// Bound the map so a spray of unique keys cannot grow it without limit.
const MAX_KEYS = 5000;

export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (BUCKETS.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    BUCKETS.set(key, arr);
    return true;
  }
  arr.push(now);
  BUCKETS.set(key, arr);
  if (BUCKETS.size > MAX_KEYS) {
    for (const [k, v] of BUCKETS) {
      if (v.length === 0 || now - v[v.length - 1] > windowMs) BUCKETS.delete(k);
    }
  }
  return false;
}

/** First hop in X-Forwarded-For, or "unknown" — never undefined (that would
 *  collapse every caller into one bucket without anyone noticing). */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
