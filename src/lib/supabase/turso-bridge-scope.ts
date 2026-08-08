/**
 * PropFlow authorization scope map — the RLS replacement, distilled from the
 * LIVE pg_policies extract (database/rpc_sources/propflow__rls_policies.json in
 * Business-Empire-Agent, 45 policies / 41 tables, pulled 2026-08-06).
 *
 * Model observed in the live policies:
 *   company  — row.company_id must equal the caller's profile.company_id
 *   user     — row.user_id must equal the caller's auth uid
 *   via      — child rows scope through their parent (e.g. invoice_items ->
 *              invoices.company_id), matching the join-based policies
 *   self     — profiles: a user reads their company's profiles, writes only
 *              their own row
 *
 * Fail-closed: a table absent from this map is REFUSED by the bridge. When a
 * new table is added to the schema, it must be added here with its scope —
 * exactly the discipline RLS enforced by defaulting to deny.
 */

export type Scope =
  | { kind: "company" }
  | { kind: "user"; column?: string }
  | { kind: "via"; parentTable: string; fkColumn: string }
  | { kind: "self_profile" };

export const SCOPE_MAP: Record<string, Scope> = {
  // company-scoped (the dominant pattern in the live policies)
  activity_log: { kind: "company" },
  application_documents: { kind: "company" },
  application_screening_reports: { kind: "company" },
  applications: { kind: "company" },
  areas: { kind: "company" },
  audit_logs: { kind: "company" },
  automation_configs: { kind: "company" },
  automation_logs: { kind: "company" },
  automation_settings: { kind: "company" },
  automation_subscriptions: { kind: "company" },
  buildings: { kind: "company" },
  commissions: { kind: "company" },
  companies: { kind: "company" }, // policy: id = profile.company_id — bridge maps company_id->id for this table
  contacts: { kind: "company" },
  documents: { kind: "company" },
  gmail_oauth_tokens: { kind: "company" },
  inspections: { kind: "company" },
  invoices: { kind: "company" },
  landlords: { kind: "company" },
  leases: { kind: "company" },
  maintenance_requests: { kind: "company" },
  properties: { kind: "company" },
  showings: { kind: "company" },
  signing_requests: { kind: "company" },
  social_accounts: { kind: "company" },
  social_posts: { kind: "company" },
  stripe_connect_accounts: { kind: "company" },
  team_invitations: { kind: "company" },
  tenant_payments: { kind: "company" },
  walkthrough_jobs: { kind: "company" },

  // user-scoped
  notifications: { kind: "user", column: "user_id" },
  agent_social_profiles: { kind: "user", column: "user_id" },

  // join-scoped children (policies reference the parent's company)
  invoice_items: { kind: "via", parentTable: "invoices", fkColumn: "invoice_id" },
  inspection_items: { kind: "via", parentTable: "inspections", fkColumn: "inspection_id" },
  property_photos: { kind: "via", parentTable: "properties", fkColumn: "property_id" },
  landlord_properties: { kind: "via", parentTable: "properties", fkColumn: "property_id" },
  automation_executions: { kind: "via", parentTable: "automation_configs", fkColumn: "config_id" },
  signing_audit_log: { kind: "via", parentTable: "signing_requests", fkColumn: "signing_request_id" },

  // special: profiles — read company-wide, write self only (3 live policies)
  profiles: { kind: "self_profile" },
};
