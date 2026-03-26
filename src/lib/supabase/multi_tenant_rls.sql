-- ============================================================================
-- PROPFLOW MULTI-TENANT RLS — Company-Scoped Access Control
-- ============================================================================
-- This replaces ALL legacy USING(true) god-mode policies with proper
-- company_id-scoped isolation. Every authenticated user can ONLY access
-- data belonging to their own company.
--
-- PREREQUISITE: The get_user_company_id() function must exist.
-- If it doesn't, run this first:
--
--   CREATE OR REPLACE FUNCTION get_user_company_id()
--   RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
--     SELECT company_id FROM profiles WHERE id = auth.uid()
--   $$;
--
-- RUN: Paste this entire file into Supabase SQL Editor and execute.
-- SAFE: All DROP POLICY IF EXISTS — re-runnable without errors.
-- ============================================================================

BEGIN;

-- =====================
-- 0. VERIFY PREREQUISITE
-- =====================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_company_id') THEN
    RAISE EXCEPTION 'MISSING FUNCTION: get_user_company_id() must exist before running this migration. See comments at top of file.';
  END IF;
END $$;

-- =====================
-- 1. PROPERTIES
-- =====================
ALTER TABLE IF EXISTS properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON properties;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON properties;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON properties;
DROP POLICY IF EXISTS "Agent_Omnibus_Properties" ON properties;
DROP POLICY IF EXISTS "Agent Full Access - Properties" ON properties;
DROP POLICY IF EXISTS "properties_select_company" ON properties;
DROP POLICY IF EXISTS "properties_insert_company" ON properties;
DROP POLICY IF EXISTS "properties_update_company" ON properties;
DROP POLICY IF EXISTS "properties_delete_company" ON properties;

CREATE POLICY "properties_select_company" ON properties FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());
CREATE POLICY "properties_insert_company" ON properties FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "properties_update_company" ON properties FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "properties_delete_company" ON properties FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());

-- =====================
-- 2. APPLICATIONS
-- =====================
ALTER TABLE IF EXISTS applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent_Omnibus_Applications" ON applications;
DROP POLICY IF EXISTS "Agent Full Access - Applications" ON applications;
DROP POLICY IF EXISTS "applications_select_company" ON applications;
DROP POLICY IF EXISTS "applications_insert_company" ON applications;
DROP POLICY IF EXISTS "applications_update_company" ON applications;
DROP POLICY IF EXISTS "applications_delete_company" ON applications;

CREATE POLICY "applications_select_company" ON applications FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());
CREATE POLICY "applications_insert_company" ON applications FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "applications_update_company" ON applications FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "applications_delete_company" ON applications FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());

-- =====================
-- 3. AREAS
-- =====================
ALTER TABLE IF EXISTS areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent_Omnibus_Areas" ON areas;
DROP POLICY IF EXISTS "Agent Full Access - Areas" ON areas;
DROP POLICY IF EXISTS "Enable read access for all users" ON areas;
DROP POLICY IF EXISTS "areas_select_company" ON areas;
DROP POLICY IF EXISTS "areas_insert_company" ON areas;
DROP POLICY IF EXISTS "areas_update_company" ON areas;
DROP POLICY IF EXISTS "areas_delete_company" ON areas;

CREATE POLICY "areas_select_company" ON areas FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());
CREATE POLICY "areas_insert_company" ON areas FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "areas_update_company" ON areas FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "areas_delete_company" ON areas FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());

-- =====================
-- 4. BUILDINGS
-- =====================
ALTER TABLE IF EXISTS buildings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent_Omnibus_Buildings" ON buildings;
DROP POLICY IF EXISTS "Agent Full Access - Buildings" ON buildings;
DROP POLICY IF EXISTS "Enable read access for all users" ON buildings;
DROP POLICY IF EXISTS "buildings_select_company" ON buildings;
DROP POLICY IF EXISTS "buildings_insert_company" ON buildings;
DROP POLICY IF EXISTS "buildings_update_company" ON buildings;
DROP POLICY IF EXISTS "buildings_delete_company" ON buildings;

CREATE POLICY "buildings_select_company" ON buildings FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());
CREATE POLICY "buildings_insert_company" ON buildings FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "buildings_update_company" ON buildings FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "buildings_delete_company" ON buildings FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());

-- =====================
-- 5. ACTIVITY_LOG
-- =====================
ALTER TABLE IF EXISTS activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent_Omnibus_Activity" ON activity_log;
DROP POLICY IF EXISTS "Agent Full Access - Activity" ON activity_log;
DROP POLICY IF EXISTS "activity_log_select_company" ON activity_log;
DROP POLICY IF EXISTS "activity_log_insert_company" ON activity_log;

CREATE POLICY "activity_log_select_company" ON activity_log FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());
CREATE POLICY "activity_log_insert_company" ON activity_log FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());
-- No UPDATE/DELETE — activity logs are append-only (immutable audit trail)

-- =====================
-- 6. LANDLORDS
-- =====================
ALTER TABLE IF EXISTS landlords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent_Omnibus_Landlords" ON landlords;
DROP POLICY IF EXISTS "Agent Full Access - Landlords" ON landlords;
DROP POLICY IF EXISTS "landlords_select_company" ON landlords;
DROP POLICY IF EXISTS "landlords_insert_company" ON landlords;
DROP POLICY IF EXISTS "landlords_update_company" ON landlords;
DROP POLICY IF EXISTS "landlords_delete_company" ON landlords;

CREATE POLICY "landlords_select_company" ON landlords FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());
CREATE POLICY "landlords_insert_company" ON landlords FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "landlords_update_company" ON landlords FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "landlords_delete_company" ON landlords FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());

-- =====================
-- 7. PROFILES (special — users see own company's profiles)
-- =====================
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent_Omnibus_Profiles" ON profiles;
DROP POLICY IF EXISTS "Agent Full Access - Profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_company" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Users can see all profiles in their company (for team features)
CREATE POLICY "profiles_select_company" ON profiles FOR SELECT TO authenticated
  USING (company_id = get_user_company_id() OR id = auth.uid());

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- =====================
-- 8. AUTOMATION_SETTINGS (admin-only via API, but RLS as safety net)
-- =====================
ALTER TABLE IF EXISTS automation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_settings_select_company" ON automation_settings;
DROP POLICY IF EXISTS "automation_settings_update_company" ON automation_settings;
DROP POLICY IF EXISTS "automation_settings_insert_company" ON automation_settings;

CREATE POLICY "automation_settings_select_company" ON automation_settings FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());
CREATE POLICY "automation_settings_update_company" ON automation_settings FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "automation_settings_insert_company" ON automation_settings FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

-- =====================
-- 9. AUTOMATION_LOGS (append-only)
-- =====================
ALTER TABLE IF EXISTS automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_logs_select_company" ON automation_logs;
DROP POLICY IF EXISTS "automation_logs_insert_company" ON automation_logs;

CREATE POLICY "automation_logs_select_company" ON automation_logs FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());
CREATE POLICY "automation_logs_insert_company" ON automation_logs FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

-- =====================
-- 10. GMAIL_OAUTH_TOKENS
-- =====================
ALTER TABLE IF EXISTS gmail_oauth_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gmail_tokens_select_company" ON gmail_oauth_tokens;
DROP POLICY IF EXISTS "gmail_tokens_manage_company" ON gmail_oauth_tokens;

CREATE POLICY "gmail_tokens_select_company" ON gmail_oauth_tokens FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());
CREATE POLICY "gmail_tokens_manage_company" ON gmail_oauth_tokens FOR ALL TO authenticated
  USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

COMMIT;

-- ============================================================================
-- VERIFICATION: Run after the migration to confirm all policies are correct
-- ============================================================================
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
