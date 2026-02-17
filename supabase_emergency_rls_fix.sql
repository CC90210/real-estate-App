-- =============================================
-- PROPFLOW EMERGENCY RLS FIX (IDEMPOTENT v3)
-- Safe to re-run. Skips tables that don't exist.
-- Run this ENTIRE script in Supabase SQL Editor.
-- =============================================


-- =============================================
-- STEP 1: HELPER FUNCTIONS (always safe)
-- =============================================

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION get_my_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_company_id() TO anon;
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_role() TO anon;


-- =============================================
-- STEP 2: FIX PROFILES (the critical table)
-- =============================================

DO $$
BEGIN
  -- Drop every possible old/new policy name
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own profile" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own profile" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Users can insert own profile" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Company isolation for profiles" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Enable read access for users" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "profiles_select_policy" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "profiles_update_policy" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Users can read own profile" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "allow_read_own_profile" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "allow_update_own_profile" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "profiles_select_own" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "profiles_insert_own" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "profiles_update_own" ON profiles';
  EXECUTE 'DROP POLICY IF EXISTS "profiles_service_role" ON profiles';

  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated
    USING (id = auth.uid());
  CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());
  CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated
    USING (id = auth.uid()) WITH CHECK (id = auth.uid());
  CREATE POLICY "profiles_service_role" ON profiles FOR ALL TO service_role
    USING (true) WITH CHECK (true);

  RAISE NOTICE '✅ profiles — DONE';
END $$;


-- =============================================
-- STEP 3: ALL OTHER TABLES (skip if missing)
-- =============================================

-- Helper: apply company_id RLS to a table (CRUD)
-- We use a DO block per table so one missing table doesn't stop the rest.

-- ---- PROPERTIES ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='properties') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for properties" ON properties';
    EXECUTE 'DROP POLICY IF EXISTS "properties_company_isolation" ON properties';
    EXECUTE 'DROP POLICY IF EXISTS "Enable read for company members" ON properties';
    EXECUTE 'DROP POLICY IF EXISTS "Admins/Agents can insert properties" ON properties';
    EXECUTE 'DROP POLICY IF EXISTS "Admins/Agents can update properties" ON properties';
    EXECUTE 'DROP POLICY IF EXISTS "properties_select" ON properties';
    EXECUTE 'DROP POLICY IF EXISTS "properties_insert" ON properties';
    EXECUTE 'DROP POLICY IF EXISTS "properties_update" ON properties';
    EXECUTE 'DROP POLICY IF EXISTS "properties_delete" ON properties';
    ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "properties_select" ON properties FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "properties_insert" ON properties FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "properties_update" ON properties FOR UPDATE TO authenticated USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "properties_delete" ON properties FOR DELETE TO authenticated USING (company_id = get_my_company_id());
    RAISE NOTICE '✅ properties — DONE';
  ELSE
    RAISE NOTICE '⏭️ properties — table not found, skipping';
  END IF;
END $$;

-- ---- APPLICATIONS ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='applications') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for applications" ON applications';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can insert applications" ON applications';
    EXECUTE 'DROP POLICY IF EXISTS "Agents can update applications" ON applications';
    EXECUTE 'DROP POLICY IF EXISTS "applications_select" ON applications';
    EXECUTE 'DROP POLICY IF EXISTS "applications_insert" ON applications';
    EXECUTE 'DROP POLICY IF EXISTS "applications_update" ON applications';
    EXECUTE 'DROP POLICY IF EXISTS "applications_delete" ON applications';
    ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "applications_select" ON applications FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "applications_insert" ON applications FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "applications_update" ON applications FOR UPDATE TO authenticated USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "applications_delete" ON applications FOR DELETE TO authenticated USING (company_id = get_my_company_id());
    RAISE NOTICE '✅ applications — DONE';
  ELSE
    RAISE NOTICE '⏭️ applications — table not found, skipping';
  END IF;
END $$;

-- ---- DOCUMENTS ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='documents') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for documents" ON documents';
    EXECUTE 'DROP POLICY IF EXISTS "documents_select" ON documents';
    EXECUTE 'DROP POLICY IF EXISTS "documents_insert" ON documents';
    EXECUTE 'DROP POLICY IF EXISTS "documents_update" ON documents';
    EXECUTE 'DROP POLICY IF EXISTS "documents_delete" ON documents';
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "documents_select" ON documents FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "documents_insert" ON documents FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "documents_update" ON documents FOR UPDATE TO authenticated USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "documents_delete" ON documents FOR DELETE TO authenticated USING (company_id = get_my_company_id());
    RAISE NOTICE '✅ documents — DONE';
  ELSE
    RAISE NOTICE '⏭️ documents — table not found, skipping';
  END IF;
END $$;

-- ---- INVOICES ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoices') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for invoices" ON invoices';
    EXECUTE 'DROP POLICY IF EXISTS "invoices_select" ON invoices';
    EXECUTE 'DROP POLICY IF EXISTS "invoices_insert" ON invoices';
    EXECUTE 'DROP POLICY IF EXISTS "invoices_update" ON invoices';
    EXECUTE 'DROP POLICY IF EXISTS "invoices_delete" ON invoices';
    ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "invoices_select" ON invoices FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "invoices_insert" ON invoices FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "invoices_update" ON invoices FOR UPDATE TO authenticated USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "invoices_delete" ON invoices FOR DELETE TO authenticated USING (company_id = get_my_company_id());
    RAISE NOTICE '✅ invoices — DONE';
  ELSE
    RAISE NOTICE '⏭️ invoices — table not found, skipping';
  END IF;
END $$;

-- ---- COMPANIES ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='companies') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for companies" ON companies';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own company" ON companies';
    EXECUTE 'DROP POLICY IF EXISTS "companies_select" ON companies';
    EXECUTE 'DROP POLICY IF EXISTS "companies_update" ON companies';
    EXECUTE 'DROP POLICY IF EXISTS "companies_service_role" ON companies';
    ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "companies_select" ON companies FOR SELECT TO authenticated USING (id = get_my_company_id());
    CREATE POLICY "companies_update" ON companies FOR UPDATE TO authenticated USING (id = get_my_company_id()) WITH CHECK (id = get_my_company_id());
    CREATE POLICY "companies_service_role" ON companies FOR ALL TO service_role USING (true) WITH CHECK (true);
    RAISE NOTICE '✅ companies — DONE';
  ELSE
    RAISE NOTICE '⏭️ companies — table not found, skipping';
  END IF;
END $$;

-- ---- SHOWINGS ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='showings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for showings" ON showings';
    EXECUTE 'DROP POLICY IF EXISTS "showings_select" ON showings';
    EXECUTE 'DROP POLICY IF EXISTS "showings_insert" ON showings';
    EXECUTE 'DROP POLICY IF EXISTS "showings_update" ON showings';
    EXECUTE 'DROP POLICY IF EXISTS "showings_delete" ON showings';
    ALTER TABLE showings ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "showings_select" ON showings FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "showings_insert" ON showings FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "showings_update" ON showings FOR UPDATE TO authenticated USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "showings_delete" ON showings FOR DELETE TO authenticated USING (company_id = get_my_company_id());
    RAISE NOTICE '✅ showings — DONE';
  ELSE
    RAISE NOTICE '⏭️ showings — table not found, skipping';
  END IF;
END $$;

-- ---- LANDLORDS ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='landlords') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for landlords" ON landlords';
    EXECUTE 'DROP POLICY IF EXISTS "landlords_select" ON landlords';
    EXECUTE 'DROP POLICY IF EXISTS "landlords_insert" ON landlords';
    EXECUTE 'DROP POLICY IF EXISTS "landlords_update" ON landlords';
    EXECUTE 'DROP POLICY IF EXISTS "landlords_delete" ON landlords';
    ALTER TABLE landlords ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "landlords_select" ON landlords FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "landlords_insert" ON landlords FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "landlords_update" ON landlords FOR UPDATE TO authenticated USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "landlords_delete" ON landlords FOR DELETE TO authenticated USING (company_id = get_my_company_id());
    RAISE NOTICE '✅ landlords — DONE';
  ELSE
    RAISE NOTICE '⏭️ landlords — table not found, skipping';
  END IF;
END $$;

-- ---- AREAS ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='areas') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for areas" ON areas';
    EXECUTE 'DROP POLICY IF EXISTS "Admins/Agents can insert areas" ON areas';
    EXECUTE 'DROP POLICY IF EXISTS "Admins/Agents can update areas" ON areas';
    EXECUTE 'DROP POLICY IF EXISTS "areas_select" ON areas';
    EXECUTE 'DROP POLICY IF EXISTS "areas_insert" ON areas';
    EXECUTE 'DROP POLICY IF EXISTS "areas_update" ON areas';
    EXECUTE 'DROP POLICY IF EXISTS "areas_delete" ON areas';
    ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "areas_select" ON areas FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "areas_insert" ON areas FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "areas_update" ON areas FOR UPDATE TO authenticated USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "areas_delete" ON areas FOR DELETE TO authenticated USING (company_id = get_my_company_id());
    RAISE NOTICE '✅ areas — DONE';
  ELSE
    RAISE NOTICE '⏭️ areas — table not found, skipping';
  END IF;
END $$;

-- ---- BUILDINGS ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='buildings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for buildings" ON buildings';
    EXECUTE 'DROP POLICY IF EXISTS "Admins/Agents can insert buildings" ON buildings';
    EXECUTE 'DROP POLICY IF EXISTS "Admins/Agents can update buildings" ON buildings';
    EXECUTE 'DROP POLICY IF EXISTS "buildings_select" ON buildings';
    EXECUTE 'DROP POLICY IF EXISTS "buildings_insert" ON buildings';
    EXECUTE 'DROP POLICY IF EXISTS "buildings_update" ON buildings';
    EXECUTE 'DROP POLICY IF EXISTS "buildings_delete" ON buildings';
    ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "buildings_select" ON buildings FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "buildings_insert" ON buildings FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "buildings_update" ON buildings FOR UPDATE TO authenticated USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "buildings_delete" ON buildings FOR DELETE TO authenticated USING (company_id = get_my_company_id());
    RAISE NOTICE '✅ buildings — DONE';
  ELSE
    RAISE NOTICE '⏭️ buildings — table not found, skipping';
  END IF;
END $$;

-- ---- ACTIVITY_LOG ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='activity_log') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for activity_log" ON activity_log';
    EXECUTE 'DROP POLICY IF EXISTS "activity_log_select" ON activity_log';
    EXECUTE 'DROP POLICY IF EXISTS "activity_log_insert" ON activity_log';
    ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "activity_log_select" ON activity_log FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "activity_log_insert" ON activity_log FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    RAISE NOTICE '✅ activity_log — DONE';
  ELSE
    RAISE NOTICE '⏭️ activity_log — table not found, skipping';
  END IF;
END $$;

-- ---- NOTIFICATIONS ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users see their notifications" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for notifications" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "notifications_select" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "notifications_insert" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "notifications_update" ON notifications';
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (company_id = get_my_company_id());
    RAISE NOTICE '✅ notifications — DONE';
  ELSE
    RAISE NOTICE '⏭️ notifications — table not found, skipping';
  END IF;
END $$;

-- ---- TEAM_INVITATIONS ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='team_invitations') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for team_invitations" ON team_invitations';
    EXECUTE 'DROP POLICY IF EXISTS "team_invitations_select" ON team_invitations';
    EXECUTE 'DROP POLICY IF EXISTS "team_invitations_insert" ON team_invitations';
    EXECUTE 'DROP POLICY IF EXISTS "team_invitations_update" ON team_invitations';
    EXECUTE 'DROP POLICY IF EXISTS "team_invitations_public_read" ON team_invitations';
    ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "team_invitations_select" ON team_invitations FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "team_invitations_insert" ON team_invitations FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "team_invitations_update" ON team_invitations FOR UPDATE TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "team_invitations_public_read" ON team_invitations FOR SELECT TO anon USING (status = 'pending');
    RAISE NOTICE '✅ team_invitations — DONE';
  ELSE
    RAISE NOTICE '⏭️ team_invitations — table not found, skipping';
  END IF;
END $$;

-- ---- LEASES ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='leases') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for leases" ON leases';
    EXECUTE 'DROP POLICY IF EXISTS "leases_select" ON leases';
    EXECUTE 'DROP POLICY IF EXISTS "leases_insert" ON leases';
    EXECUTE 'DROP POLICY IF EXISTS "leases_update" ON leases';
    EXECUTE 'DROP POLICY IF EXISTS "leases_delete" ON leases';
    ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "leases_select" ON leases FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "leases_insert" ON leases FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "leases_update" ON leases FOR UPDATE TO authenticated USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "leases_delete" ON leases FOR DELETE TO authenticated USING (company_id = get_my_company_id());
    RAISE NOTICE '✅ leases — DONE';
  ELSE
    RAISE NOTICE '⏭️ leases — table not found, skipping';
  END IF;
END $$;

-- ---- MAINTENANCE_REQUESTS ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='maintenance_requests') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for maintenance_requests" ON maintenance_requests';
    EXECUTE 'DROP POLICY IF EXISTS "maintenance_requests_select" ON maintenance_requests';
    EXECUTE 'DROP POLICY IF EXISTS "maintenance_requests_insert" ON maintenance_requests';
    EXECUTE 'DROP POLICY IF EXISTS "maintenance_requests_update" ON maintenance_requests';
    EXECUTE 'DROP POLICY IF EXISTS "maintenance_requests_delete" ON maintenance_requests';
    ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "maintenance_requests_select" ON maintenance_requests FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "maintenance_requests_insert" ON maintenance_requests FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "maintenance_requests_update" ON maintenance_requests FOR UPDATE TO authenticated USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "maintenance_requests_delete" ON maintenance_requests FOR DELETE TO authenticated USING (company_id = get_my_company_id());
    RAISE NOTICE '✅ maintenance_requests — DONE';
  ELSE
    RAISE NOTICE '⏭️ maintenance_requests — table not found, skipping';
  END IF;
END $$;

-- ---- CONTACTS ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contacts') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for contacts" ON contacts';
    EXECUTE 'DROP POLICY IF EXISTS "contacts_select" ON contacts';
    EXECUTE 'DROP POLICY IF EXISTS "contacts_insert" ON contacts';
    EXECUTE 'DROP POLICY IF EXISTS "contacts_update" ON contacts';
    EXECUTE 'DROP POLICY IF EXISTS "contacts_delete" ON contacts';
    ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "contacts_select" ON contacts FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "contacts_insert" ON contacts FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "contacts_update" ON contacts FOR UPDATE TO authenticated USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "contacts_delete" ON contacts FOR DELETE TO authenticated USING (company_id = get_my_company_id());
    RAISE NOTICE '✅ contacts — DONE';
  ELSE
    RAISE NOTICE '⏭️ contacts — table not found, skipping';
  END IF;
END $$;

-- ---- COMMISSIONS ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='commissions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for commissions" ON commissions';
    EXECUTE 'DROP POLICY IF EXISTS "commissions_select" ON commissions';
    EXECUTE 'DROP POLICY IF EXISTS "commissions_insert" ON commissions';
    EXECUTE 'DROP POLICY IF EXISTS "commissions_update" ON commissions';
    EXECUTE 'DROP POLICY IF EXISTS "commissions_delete" ON commissions';
    ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "commissions_select" ON commissions FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "commissions_insert" ON commissions FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "commissions_update" ON commissions FOR UPDATE TO authenticated USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "commissions_delete" ON commissions FOR DELETE TO authenticated USING (company_id = get_my_company_id());
    RAISE NOTICE '✅ commissions — DONE';
  ELSE
    RAISE NOTICE '⏭️ commissions — table not found, skipping';
  END IF;
END $$;

-- ---- AUTOMATION_CONFIGS ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='automation_configs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for automation_configs" ON automation_configs';
    EXECUTE 'DROP POLICY IF EXISTS "automation_configs_select" ON automation_configs';
    EXECUTE 'DROP POLICY IF EXISTS "automation_configs_insert" ON automation_configs';
    EXECUTE 'DROP POLICY IF EXISTS "automation_configs_update" ON automation_configs';
    ALTER TABLE automation_configs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "automation_configs_select" ON automation_configs FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "automation_configs_insert" ON automation_configs FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "automation_configs_update" ON automation_configs FOR UPDATE TO authenticated USING (company_id = get_my_company_id());
    RAISE NOTICE '✅ automation_configs — DONE';
  ELSE
    RAISE NOTICE '⏭️ automation_configs — table not found, skipping';
  END IF;
END $$;

-- ---- AUTOMATION_SUBSCRIPTIONS ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='automation_subscriptions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for automation_subscriptions" ON automation_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "automation_subscriptions_select" ON automation_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "automation_subscriptions_insert" ON automation_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "automation_subscriptions_update" ON automation_subscriptions';
    ALTER TABLE automation_subscriptions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "automation_subscriptions_select" ON automation_subscriptions FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "automation_subscriptions_insert" ON automation_subscriptions FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "automation_subscriptions_update" ON automation_subscriptions FOR UPDATE TO authenticated USING (company_id = get_my_company_id());
    RAISE NOTICE '✅ automation_subscriptions — DONE';
  ELSE
    RAISE NOTICE '⏭️ automation_subscriptions — table not found, skipping';
  END IF;
END $$;

-- ---- AUTOMATION_LOGS ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='automation_logs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for automation_logs" ON automation_logs';
    EXECUTE 'DROP POLICY IF EXISTS "automation_logs_select" ON automation_logs';
    EXECUTE 'DROP POLICY IF EXISTS "automation_logs_insert" ON automation_logs';
    ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "automation_logs_select" ON automation_logs FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "automation_logs_insert" ON automation_logs FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    RAISE NOTICE '✅ automation_logs — DONE';
  ELSE
    RAISE NOTICE '⏭️ automation_logs — table not found, skipping';
  END IF;
END $$;

-- ---- AUDIT_LOGS ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_logs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation for audit_logs" ON audit_logs';
    EXECUTE 'DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs';
    EXECUTE 'DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs';
    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated USING (company_id = get_my_company_id());
    CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());
    RAISE NOTICE '✅ audit_logs — DONE';
  ELSE
    RAISE NOTICE '⏭️ audit_logs — table not found, skipping';
  END IF;
END $$;


-- =============================================
-- STEP 4: PERFORMANCE INDEXES (safe — IF NOT EXISTS)
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='properties') THEN
    CREATE INDEX IF NOT EXISTS idx_properties_company ON properties(company_id);
    CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(company_id, status);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='applications') THEN
    CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company_id);
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(company_id, status);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='documents') THEN
    CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoices') THEN
    CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='activity_log') THEN
    CREATE INDEX IF NOT EXISTS idx_activity_company ON activity_log(company_id);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(company_id, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='showings') THEN
    CREATE INDEX IF NOT EXISTS idx_showings_company ON showings(company_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='landlords') THEN
    CREATE INDEX IF NOT EXISTS idx_landlords_company ON landlords(company_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='areas') THEN
    CREATE INDEX IF NOT EXISTS idx_areas_company ON areas(company_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='buildings') THEN
    CREATE INDEX IF NOT EXISTS idx_buildings_company ON buildings(company_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id);
  END IF;
  RAISE NOTICE '✅ Indexes — DONE';
END $$;


-- =============================================
-- STEP 5: VERIFY (should not error)
-- =============================================

SELECT get_my_company_id();
SELECT id, email, company_id FROM profiles LIMIT 1;
