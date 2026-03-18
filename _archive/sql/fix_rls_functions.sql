-- 1. Redefine helper functions without STABLE to prevent Postgres planner inlining/recursion
CREATE OR REPLACE FUNCTION get_my_company_id() RETURNS UUID LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
SELECT company_id
FROM profiles
WHERE id = auth.uid();
$$;
CREATE OR REPLACE FUNCTION get_my_company() RETURNS UUID LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
SELECT company_id
FROM profiles
WHERE id = auth.uid();
$$;
CREATE OR REPLACE FUNCTION get_my_role() RETURNS text LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
SELECT COALESCE(role::text, 'admin')
FROM profiles
WHERE id = auth.uid();
$$;
-- 2. Backfill any missed role defaults
UPDATE profiles
SET role = 'admin'
WHERE role IS NULL;
-- 3. We must also fix the Landlord script's usage to be absolutely safe
CREATE OR REPLACE FUNCTION get_my_landlord_ids() RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
SELECT id
FROM landlords
WHERE email = auth.jwt()->>'email';
$$;
CREATE OR REPLACE FUNCTION get_my_landlord_property_ids() RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
SELECT id
FROM properties
WHERE landlord_id IN (
        SELECT id
        FROM landlords
        WHERE email = auth.jwt()->>'email'
    );
$$;