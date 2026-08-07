/**
 * Columns a browser-originated write may never set — the port of PropFlow's
 * privilege-protection TRIGGERS.
 *
 * In Postgres, protect_company_entitlements and protect_profile_privileges
 * raised unless `auth.role() = 'service_role'`. Browser clients used the anon
 * key, so auth.role() was 'authenticated' and the triggers fired.
 *
 * The Turso bridge connects with a full-database token. There is no role
 * distinction left, so the triggers' service-role bypass would cover EVERY
 * request and protect nothing. Verified before writing this: a logged-in user
 * could set their own company's subscription_plan to 'enterprise' and the write
 * landed (200, and the row really changed).
 *
 * Column lists are transcribed from the live pg_get_functiondef output, not
 * inferred — a guessed list is how a guard ends up covering four of eleven
 * fields. Re-check them if the triggers change:
 *   select pg_get_functiondef(oid) from pg_proc
 *    where proname in ('protect_company_entitlements','protect_profile_privileges');
 */

/** Billing/entitlement fields — protect_company_entitlements. */
const COMPANY_ENTITLEMENTS = [
    "subscription_plan",
    "subscription_status",
    "subscription_tier",
    "is_lifetime_access",
    "feature_flags",
    "stripe_customer_id",
    "stripe_subscription_id",
    "subscription_current_period_end",
    "plan_override",
    "plan_override_reason",
    "plan_override_by",
    "subscription_ends_at",
    "trial_ends_at",
] as const;

/** Identity/privilege fields — protect_profile_privileges, first branch. */
const PROFILE_PRIVILEGES = [
    "email",
    "is_super_admin",
    "is_partner",
    "partner_type",
    "stripe_customer_id",
] as const;

/**
 * Membership fields — protect_profile_privileges, second branch. Postgres
 * allowed these for a company administrator. The bridge has no admin check yet,
 * so they are denied outright: refusing a legitimate admin edit is a visible
 * bug, while allowing a self-serve role change is a silent breach.
 */
const PROFILE_MEMBERSHIP = ["company_id", "role", "is_active"] as const;

export const GUARDED_COLUMNS: Record<string, ReadonlySet<string>> = {
    companies: new Set<string>(COMPANY_ENTITLEMENTS),
    profiles: new Set<string>([...PROFILE_PRIVILEGES, ...PROFILE_MEMBERSHIP]),
};

/** Guarded columns present in a write payload, or [] when it is clean. */
export function guardedColumnsIn(
    table: string,
    values: Record<string, unknown> | Record<string, unknown>[] | undefined,
): string[] {
    const guarded = GUARDED_COLUMNS[table];
    if (!guarded || !values) return [];
    const rows = Array.isArray(values) ? values : [values];
    const hits = new Set<string>();
    for (const row of rows) {
        for (const key of Object.keys(row ?? {})) {
            if (guarded.has(key)) hits.add(key);
        }
    }
    return [...hits];
}
