-- =============================================
-- PROPFLOW NUCLEAR RLS FIX v4
-- Drops ALL policies on profiles by querying
-- pg_policies — no policy name is missed.
-- Run this ENTIRE script in Supabase SQL Editor.
-- =============================================


-- =============================================
-- STEP 1: LIST ALL CURRENT POLICIES ON PROFILES
-- (So you can see what's there before we nuke)
-- =============================================

SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';


-- =============================================
-- STEP 2: DROP *EVERY* POLICY ON PROFILES
-- Uses dynamic SQL to loop through pg_policies
-- =============================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
    RAISE NOTICE '🔥 ALL policies on profiles dropped';
END $$;


-- =============================================
-- STEP 3: DROP *EVERY* POLICY ON companies TOO
-- (companies policies may also reference profiles)
-- =============================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'companies'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON companies', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
    RAISE NOTICE '🔥 ALL policies on companies dropped';
END $$;


-- =============================================
-- STEP 4: RECREATE HELPER FUNCTIONS
-- SECURITY DEFINER = runs as postgres, bypasses RLS
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
-- STEP 5: CREATE ONLY SAFE POLICIES ON PROFILES
-- These use auth.uid() directly — ZERO recursion
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Service role can do anything (for triggers, admin functions)
CREATE POLICY "profiles_service_role"
ON profiles FOR ALL TO service_role
USING (true) WITH CHECK (true);


-- =============================================
-- STEP 6: CREATE ONLY SAFE POLICIES ON COMPANIES
-- =============================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select"
ON companies FOR SELECT TO authenticated
USING (id = get_my_company_id());

CREATE POLICY "companies_update"
ON companies FOR UPDATE TO authenticated
USING (id = get_my_company_id())
WITH CHECK (id = get_my_company_id());

CREATE POLICY "companies_insert"
ON companies FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "companies_service_role"
ON companies FOR ALL TO service_role
USING (true) WITH CHECK (true);


-- =============================================
-- STEP 7: NUKE + REBUILD ALL OTHER TABLES
-- Same dynamic approach for every other table
-- =============================================

DO $$
DECLARE
    tbl TEXT;
    pol RECORD;
BEGIN
    -- Loop through every table we care about
    FOREACH tbl IN ARRAY ARRAY[
        'properties', 'applications', 'documents', 'invoices',
        'leases', 'showings', 'landlords', 'areas', 'buildings',
        'activity_log', 'notifications', 'team_invitations',
        'maintenance_requests', 'contacts', 'commissions',
        'automation_configs', 'automation_subscriptions', 'automation_logs',
        'audit_logs'
    ]
    LOOP
        -- Skip if table doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            RAISE NOTICE '⏭️  % — table not found, skipping', tbl;
            CONTINUE;
        END IF;

        -- Drop ALL existing policies on this table
        FOR pol IN
            SELECT policyname FROM pg_policies WHERE tablename = tbl
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
        END LOOP;

        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

        -- Create standard CRUD policies using get_my_company_id()
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (company_id = get_my_company_id())',
            tbl || '_select', tbl
        );
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id())',
            tbl || '_insert', tbl
        );
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id())',
            tbl || '_update', tbl
        );
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (company_id = get_my_company_id())',
            tbl || '_delete', tbl
        );

        RAISE NOTICE '✅ % — DONE', tbl;
    END LOOP;
END $$;


-- =============================================
-- STEP 8: PERFORMANCE INDEXES
-- =============================================

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'properties', 'applications', 'documents', 'invoices',
        'showings', 'landlords', 'areas', 'buildings',
        'activity_log', 'notifications'
    ]
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tbl) THEN
            EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_company ON %I(company_id)', tbl, tbl);
        END IF;
    END LOOP;
    RAISE NOTICE '✅ Indexes — DONE';
END $$;


-- =============================================
-- STEP 9: VERIFY — should return YOUR profile
-- =============================================

-- Show all remaining policies on profiles (should be exactly 4)
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'profiles';

-- Test the actual queries
SELECT get_my_company_id();
SELECT id, email, company_id, role FROM profiles LIMIT 1;
SELECT id, address FROM properties LIMIT 3;
