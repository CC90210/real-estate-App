import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const migrationsDir = join(process.cwd(), 'supabase', 'migrations')
const canonicalMigration = '20260719000000_initial_schema.sql'
const activeMigrations = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))

assert.deepEqual(
  activeMigrations,
  [canonicalMigration],
  'Supabase must have one deterministic baseline; legacy hotfixes belong in supabase/_archive/migrations',
)

const sql = readFileSync(join(migrationsDir, canonicalMigration), 'utf8')

const requiredTables = [
  'companies',
  'profiles',
  'areas',
  'buildings',
  'landlords',
  'properties',
  'property_photos',
  'applications',
  'application_documents',
  'application_screening_reports',
  'activity_log',
  'audit_logs',
  'documents',
  'invoices',
  'invoice_items',
  'showings',
  'leases',
  'maintenance_requests',
  'notifications',
  'contacts',
  'commissions',
  'inspections',
  'inspection_items',
  'team_invitations',
  'platform_invitations',
  'automation_subscriptions',
  'automation_settings',
  'automation_logs',
  'automation_configs',
  'automation_executions',
  'webhook_events',
  'incoming_webhook_events',
  'api_rate_limits',
  'gmail_oauth_tokens',
  'tenant_payments',
  'stripe_connect_accounts',
  'landlord_properties',
  'agent_social_profiles',
  'social_accounts',
  'social_posts',
  'signing_requests',
  'signing_audit_log',
  'walkthrough_jobs',
]

for (const table of requiredTables) {
  assert.match(sql, new RegExp(`CREATE TABLE public\\.${table}\\b`, 'i'), `missing table ${table}`)
  assert.match(
    sql,
    new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i'),
    `RLS must be enabled on ${table}`,
  )
}

for (const fn of [
  'get_user_company_id',
  'ensure_user_profile',
  'ensure_user_profile_admin',
  'get_invitation_by_token',
  'accept_invitation_manually',
  'get_enhanced_dashboard_stats',
  'generate_invoice_number',
  'check_rate_limit',
  'register_incoming_webhook_event',
  'count_active_walkthroughs',
  'reap_stale_walkthrough_jobs',
]) {
  assert.match(sql, new RegExp(`FUNCTION public\\.${fn}\\b`, 'i'), `missing function ${fn}`)
}

assert.match(sql, /CREATE TRIGGER on_auth_user_created[\s\S]+ON auth\.users/i)
assert.doesNotMatch(sql, /TO authenticated[\s\S]{0,120}USING\s*\(\s*true\s*\)/i)
assert.match(
  sql,
  /REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated, service_role/i,
  'function execution must fail closed before individual RPC grants are applied',
)
assert.doesNotMatch(
  sql,
  /GRANT EXECUTE ON FUNCTION public\.ensure_user_profile_admin\([^;]+\) TO (?:PUBLIC|anon|authenticated)/i,
  'admin profile provisioning must remain service-role only',
)
assert.doesNotMatch(
  sql,
  /GRANT EXECUTE ON FUNCTION public\.increment_automation_counter\([^;]+\) TO (?:PUBLIC|anon|authenticated)/i,
  'automation counters must remain service-role only',
)
assert.match(
  sql,
  /CREATE TRIGGER protect_profile_privileges_before_update[\s\S]+FUNCTION public\.protect_profile_privileges\(\)/i,
  'profile privilege fields must be protected independently of row-level policies',
)
assert.match(
  sql,
  /CREATE TRIGGER protect_company_entitlements_before_update[\s\S]+FUNCTION public\.protect_company_entitlements\(\)/i,
  'subscription and billing entitlements must not be editable by ordinary company admins',
)
assert.match(
  sql,
  /accept_invitation_manually[\s\S]+set_config\('propflow\.trusted_profile_update', 'on', true\)[\s\S]+UPDATE public\.profiles/i,
  'the invitation RPC must explicitly opt into its reviewed profile membership transition',
)

for (const bucket of ['documents', 'logos', 'media', 'application-documents', 'application-screening-reports']) {
  assert.match(sql, new RegExp(`'${bucket}'`), `missing storage bucket ${bucket}`)
}

console.log(`Schema baseline contract passed (${requiredTables.length} tenant-aware tables)`)
