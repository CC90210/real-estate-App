-- ============================================================
-- BULLETPROOF RLS REPAIR: STOPS RECURSIVE TIMEOUTS FOREVER
-- ============================================================
-- 1. Ensure our helper function is owned by postgres to absolutely guarantee BYPASSRLS
CREATE OR REPLACE FUNCTION public.get_my_company_id() RETURNS UUID AS $$
DECLARE cid UUID;
BEGIN
SELECT company_id INTO cid
FROM public.profiles
WHERE id = auth.uid()
LIMIT 1;
RETURN cid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
-- Explicitly assign ownership to postgres so SECURITY DEFINER bypasses all RLS flawlessly
ALTER FUNCTION public.get_my_company_id() OWNER TO postgres;
CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS text AS $$
DECLARE r text;
BEGIN
SELECT COALESCE(role::text, 'admin') INTO r
FROM public.profiles
WHERE id = auth.uid()
LIMIT 1;
RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
ALTER FUNCTION public.get_my_role() OWNER TO postgres;
CREATE OR REPLACE FUNCTION public.get_my_landlord_ids() RETURNS SETOF uuid AS $$ BEGIN RETURN QUERY
SELECT id
FROM public.landlords
WHERE email = auth.jwt()->>'email';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
ALTER FUNCTION public.get_my_landlord_ids() OWNER TO postgres;
-- 2. Clean out old messy recursive policies on the core tables
DO $$
DECLARE pol RECORD;
BEGIN FOR pol IN
SELECT policyname,
    tablename
FROM pg_policies
WHERE tablename IN ('profiles', 'companies', 'activity_log') LOOP EXECUTE format(
        'DROP POLICY IF EXISTS %I ON %I',
        pol.policyname,
        pol.tablename
    );
END LOOP;
END $$;
-- 3. The Holy Grail of Profile RLS: Flat auth.uid() checks for yourself + RPC company check for others
-- Because get_my_company_id() is now explicitly forced to bypass RLS, this will never recurse.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR
SELECT TO authenticated USING (
        id = auth.uid()
        OR company_id = public.get_my_company_id()
    );
CREATE POLICY "profiles_update_own" ON profiles FOR
UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles FOR
INSERT TO authenticated WITH CHECK (id = auth.uid());
-- 4. Companies RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_select" ON companies FOR
SELECT TO authenticated USING (id = public.get_my_company_id());
CREATE POLICY "companies_update" ON companies FOR
UPDATE TO authenticated USING (id = public.get_my_company_id());
CREATE POLICY "companies_insert" ON companies FOR
INSERT TO authenticated WITH CHECK (true);
-- 5. Activity Log (Often causes recursion if not careful with user joins)
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_log_select" ON activity_log FOR
SELECT TO authenticated USING (company_id = public.get_my_company_id());
CREATE POLICY "activity_log_insert" ON activity_log FOR
INSERT TO authenticated WITH CHECK (company_id = public.get_my_company_id());
-- 6. Guarantee any empty roles are filled so the dashboard layout registers properly
UPDATE profiles
SET role = 'admin'
WHERE role IS NULL;