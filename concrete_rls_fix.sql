-- ============================================================
-- CONCRETE RLS FIX: No Recursion, PlPgSQL Isolation
-- ============================================================
-- 1. Use PL/pgSQL for helper functions. 
-- PlPgSQL functions are NEVER inlined by the Postgres planner, 
-- definitively solving the "infinite recursion" RLS error.
CREATE OR REPLACE FUNCTION get_my_company_id() RETURNS UUID AS $$
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
CREATE OR REPLACE FUNCTION get_my_role() RETURNS text AS $$
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
CREATE OR REPLACE FUNCTION get_my_company() RETURNS UUID AS $$
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
CREATE OR REPLACE FUNCTION get_my_landlord_ids() RETURNS SETOF uuid AS $$ BEGIN RETURN QUERY
SELECT id
FROM public.landlords
WHERE email = auth.jwt()->>'email';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
CREATE OR REPLACE FUNCTION get_my_landlord_property_ids() RETURNS SETOF uuid AS $$ BEGIN RETURN QUERY
SELECT id
FROM public.properties
WHERE landlord_id IN (
        SELECT id
        FROM public.landlords
        WHERE email = auth.jwt()->>'email'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
-- 2. Drop all policies on the core tables to start fresh
DO $$
DECLARE pol RECORD;
BEGIN FOR pol IN
SELECT policyname
FROM pg_policies
WHERE tablename IN (
        'profiles',
        'companies',
        'properties',
        'applications',
        'invoices',
        'showings',
        'activity_log',
        'social_accounts',
        'social_posts',
        'maintenance_requests',
        'automation_configs'
    ) LOOP EXECUTE format(
        'DROP POLICY IF EXISTS %I ON %I',
        pol.policyname,
        pol.tablename
    );
END LOOP;
END $$;
-- 3. Core Tables RLS: Safe direct queries avoiding circular dependencies
-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR
SELECT TO authenticated USING (
        -- Users can see themselves
        id = auth.uid() -- Or users in the same company
        OR company_id = get_my_company_id()
    );
CREATE POLICY "profiles_update_own" ON profiles FOR
UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles FOR
INSERT TO authenticated WITH CHECK (id = auth.uid());
-- COMPANIES
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_select" ON companies FOR
SELECT TO authenticated USING (id = get_my_company_id());
CREATE POLICY "companies_update" ON companies FOR
UPDATE TO authenticated USING (id = get_my_company_id());
CREATE POLICY "companies_insert" ON companies FOR
INSERT TO authenticated WITH CHECK (true);
-- 4. Shared helper for standard company-based CRUD policies
DO $$
DECLARE tbl TEXT;
BEGIN FOREACH tbl IN ARRAY ARRAY [
        'properties', 'applications', 'invoices', 'showings', 'activity_log', 'social_accounts', 'social_posts', 'maintenance_requests', 'automation_configs'
    ] LOOP IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = tbl
) THEN EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
-- Landlord specific logic for Properties
IF tbl = 'properties' THEN EXECUTE 'CREATE POLICY properties_select ON properties FOR SELECT TO authenticated USING (
                    company_id = get_my_company_id() AND (
                        get_my_role() != ''landlord'' OR landlord_id IN (SELECT get_my_landlord_ids())
                    )
                )';
ELSE EXECUTE format(
    'CREATE POLICY %I_select ON %I FOR SELECT TO authenticated USING (company_id = get_my_company_id())',
    tbl,
    tbl
);
END IF;
EXECUTE format(
    'CREATE POLICY %I_insert ON %I FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id())',
    tbl,
    tbl
);
EXECUTE format(
    'CREATE POLICY %I_update ON %I FOR UPDATE TO authenticated USING (company_id = get_my_company_id())',
    tbl,
    tbl
);
EXECUTE format(
    'CREATE POLICY %I_delete ON %I FOR DELETE TO authenticated USING (company_id = get_my_company_id())',
    tbl,
    tbl
);
END IF;
END LOOP;
END $$;
-- Ensure missing roles are defaulted
UPDATE profiles
SET role = 'admin'
WHERE role IS NULL;
-- Enable Supabase RPC for dashboard stats to work smoothly
CREATE OR REPLACE FUNCTION get_enhanced_dashboard_stats(
        p_company_id uuid,
        p_user_id uuid DEFAULT NULL,
        p_is_landlord boolean DEFAULT false
    ) RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE result json;
BEGIN
SELECT json_build_object(
        'totalProperties',
        (
            SELECT count(*)
            FROM properties
            WHERE company_id = p_company_id
        ),
        'availableProperties',
        (
            SELECT count(*)
            FROM properties
            WHERE company_id = p_company_id
                AND status = 'available'
        ),
        'rentedProperties',
        (
            SELECT count(*)
            FROM properties
            WHERE company_id = p_company_id
                AND status = 'rented'
        ),
        'totalApplications',
        (
            SELECT count(*)
            FROM applications
            WHERE company_id = p_company_id
        ),
        'pendingApplications',
        (
            SELECT count(*)
            FROM applications
            WHERE company_id = p_company_id
                AND status = 'pending'
        ),
        'teamMembers',
        (
            SELECT count(*)
            FROM profiles
            WHERE company_id = p_company_id
        ),
        'recent_activity',
        (
            SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json)
            FROM (
                    SELECT id,
                        action,
                        entity_type,
                        details,
                        created_at,
                        (
                            SELECT row_to_json(p)
                            FROM (
                                    SELECT full_name,
                                        avatar_url
                                    FROM profiles
                                    WHERE id = activity_log.user_id
                                ) p
                        ) as "user"
                    FROM activity_log
                    WHERE company_id = p_company_id
                    ORDER BY created_at DESC
                    LIMIT 10
                ) a
        )
    ) INTO result;
RETURN result;
END;
$$;