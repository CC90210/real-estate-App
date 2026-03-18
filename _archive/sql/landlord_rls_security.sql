-- ============================================================
-- PROPFLOW LANDLORD DATA SEGREGATION SQL
-- Run this script in the Supabase SQL Editor to enforce Strict 
-- Row Level Security (RLS) for Landlord accounts across the app.
-- ============================================================
-- ------------------------------------------------------------
-- 1. Helper Functions (Security Definer ensures RLS bypass for these checks)
-- ------------------------------------------------------------
-- Helper to retrieve the current auth user's role without triggering infinite recursion
CREATE OR REPLACE FUNCTION get_my_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
SELECT role::text
FROM profiles
WHERE id = auth.uid();
$$;
-- Helper to retrieve landlord IDs associated with the current user's email login
CREATE OR REPLACE FUNCTION get_my_landlord_ids() RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
SELECT id
FROM landlords
WHERE email = auth.jwt()->>'email';
$$;
-- Helper to retrieve property IDs owned by the current landlord
CREATE OR REPLACE FUNCTION get_my_landlord_property_ids() RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
SELECT id
FROM properties
WHERE landlord_id IN (
        SELECT id
        FROM landlords
        WHERE email = auth.jwt()->>'email'
    );
$$;
-- ------------------------------------------------------------
-- 2. Modify SELECT Policies to enforce Landlord restrictions
-- ------------------------------------------------------------
-- PROPERTIES Table
DROP POLICY IF EXISTS "properties_select" ON properties;
CREATE POLICY "properties_select" ON properties FOR
SELECT USING (
        company_id = get_my_company_id()
        AND (
            get_my_role() != 'landlord'
            OR (
                get_my_role() = 'landlord'
                AND landlord_id IN (
                    SELECT get_my_landlord_ids()
                )
            )
        )
    );
-- SHOWINGS Table (if exists)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'showings'
) THEN EXECUTE 'DROP POLICY IF EXISTS "showings_select" ON showings';
EXECUTE 'CREATE POLICY "showings_select" ON showings FOR SELECT USING (
    company_id = get_my_company_id() AND (
      get_my_role() != ''landlord'' OR 
      (get_my_role() = ''landlord'' AND property_id IN (SELECT get_my_landlord_property_ids()))
    )
  )';
END IF;
END $$;
-- INVOICES Table (if exists)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'invoices'
) THEN EXECUTE 'DROP POLICY IF EXISTS "invoices_select" ON invoices';
EXECUTE 'CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (
    company_id = get_my_company_id() AND (
      get_my_role() != ''landlord'' OR 
      (get_my_role() = ''landlord'' AND property_id IN (SELECT get_my_landlord_property_ids()))
    )
  )';
END IF;
END $$;
-- DOCUMENTS Table (if exists)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'documents'
) THEN EXECUTE 'DROP POLICY IF EXISTS "documents_select" ON documents';
EXECUTE 'CREATE POLICY "documents_select" ON documents FOR SELECT USING (
    company_id = get_my_company_id() AND (
      get_my_role() != ''landlord'' OR 
      (get_my_role() = ''landlord'' AND (
        related_property_id IN (SELECT get_my_landlord_property_ids()) OR 
        related_landlord_id IN (SELECT get_my_landlord_ids())
      ))
    )
  )';
END IF;
END $$;
-- LEASES Table (if exists)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'leases'
) THEN EXECUTE 'DROP POLICY IF EXISTS "leases_select" ON leases';
EXECUTE 'CREATE POLICY "leases_select" ON leases FOR SELECT USING (
    company_id = get_my_company_id() AND (
      get_my_role() != ''landlord'' OR 
      (get_my_role() = ''landlord'' AND property_id IN (SELECT get_my_landlord_property_ids()))
    )
  )';
END IF;
END $$;
-- APPLICATIONS Table (if exists)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'applications'
) THEN EXECUTE 'DROP POLICY IF EXISTS "applications_select" ON applications';
EXECUTE 'CREATE POLICY "applications_select" ON applications FOR SELECT USING (
    company_id = get_my_company_id() AND (
      get_my_role() != ''landlord'' OR 
      (get_my_role() = ''landlord'' AND property_id IN (SELECT get_my_landlord_property_ids()))
    )
  )';
END IF;
END $$;
-- MAINTENANCE Table (if exists)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'maintenance'
) THEN EXECUTE 'DROP POLICY IF EXISTS "maintenance_select" ON maintenance';
EXECUTE 'CREATE POLICY "maintenance_select" ON maintenance FOR SELECT USING (
    company_id = get_my_company_id() AND (
      get_my_role() != ''landlord'' OR 
      (get_my_role() = ''landlord'' AND property_id IN (SELECT get_my_landlord_property_ids()))
    )
  )';
END IF;
END $$;
-- ============================================================
-- COMPLETION
-- ============================================================
-- Once executed, landlords will mathematically NOT be able to view, 
-- intercept, or hack data outside their explicitly assigned subset. 
-- ============================================================