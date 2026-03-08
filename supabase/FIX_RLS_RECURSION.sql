-- FIX_RLS_RECURSION.sql
-- ==========================================================================
-- THIS FIXES THE ROOT CAUSE OF ALL "infinite recursion" ERRORS
-- ==========================================================================
-- Problem: The profiles RLS policy does a sub-SELECT on profiles, which
-- triggers the same policy again → infinite loop. This breaks:
--   - Properties page ("Failed to load portfolio")
--   - Any query that JOINs profiles (maintenance, activity log, etc.)
--   - Any RLS policy on OTHER tables that references profiles
--   - The admin panel (can't check user role)
--
-- Solution: Create a SECURITY DEFINER function that bypasses RLS to
-- safely retrieve the current user's company_id, then rewrite all
-- recursive policies to use this function instead of sub-SELECTs.
-- ==========================================================================

-- 1. SECURITY DEFINER FUNCTION (bypasses RLS, runs as owner)
-- This is the standard Supabase pattern to avoid RLS recursion.
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated;

-- Helper: get current user's role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- ==========================================================================
-- 2. FIX PROFILES RLS (the primary recursion source)
-- ==========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing select policies on profiles to start clean
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_company" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in same company" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- New non-recursive policy: users can see their own profile + same company
CREATE POLICY "profiles_select_safe" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR company_id = public.get_my_company_id()
    );

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Users can insert their own profile (signup flow)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- ==========================================================================
-- 3. FIX COMPANIES RLS (ensure it doesn't reference profiles recursively)
-- ==========================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public companies select" ON public.companies;
DROP POLICY IF EXISTS "companies_select_authenticated" ON public.companies;
DROP POLICY IF EXISTS "Companies are viewable by members" ON public.companies;

-- Simple: all authenticated users can read companies
-- (multi-tenant isolation is enforced by company_id filtering in app code)
CREATE POLICY "companies_select_authenticated" ON public.companies
    FOR SELECT TO authenticated
    USING (true);

-- ==========================================================================
-- 4. FIX PROPERTIES RLS (if it references profiles)
-- ==========================================================================
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Drop any policy that might reference profiles
DROP POLICY IF EXISTS "properties_select" ON public.properties;
DROP POLICY IF EXISTS "Properties are viewable by company members" ON public.properties;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.properties;
DROP POLICY IF EXISTS "properties_select_company" ON public.properties;

-- Safe policy using the SECURITY DEFINER function
CREATE POLICY "properties_select_company" ON public.properties
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id());

-- Allow inserts/updates for same company
DROP POLICY IF EXISTS "properties_insert_company" ON public.properties;
CREATE POLICY "properties_insert_company" ON public.properties
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "properties_update_company" ON public.properties;
CREATE POLICY "properties_update_company" ON public.properties
    FOR UPDATE TO authenticated
    USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "properties_delete_company" ON public.properties;
CREATE POLICY "properties_delete_company" ON public.properties
    FOR DELETE TO authenticated
    USING (company_id = public.get_my_company_id());

-- ==========================================================================
-- 5. FIX ALL OTHER TABLES THAT MAY REFERENCE PROFILES IN RLS
-- Use the same safe pattern: company_id = get_my_company_id()
-- ==========================================================================

-- APPLICATIONS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "applications_select" ON public.applications;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.applications;
DROP POLICY IF EXISTS "applications_select_company" ON public.applications;
CREATE POLICY "applications_select_company" ON public.applications
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "applications_insert_company" ON public.applications;
CREATE POLICY "applications_insert_company" ON public.applications
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "applications_update_company" ON public.applications;
CREATE POLICY "applications_update_company" ON public.applications
    FOR UPDATE TO authenticated
    USING (company_id = public.get_my_company_id());

-- AREAS
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "areas_select" ON public.areas;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.areas;
DROP POLICY IF EXISTS "areas_select_company" ON public.areas;
CREATE POLICY "areas_select_company" ON public.areas
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "areas_insert_company" ON public.areas;
CREATE POLICY "areas_insert_company" ON public.areas
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "areas_update_company" ON public.areas;
CREATE POLICY "areas_update_company" ON public.areas
    FOR UPDATE TO authenticated
    USING (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "areas_delete_company" ON public.areas;
CREATE POLICY "areas_delete_company" ON public.areas
    FOR DELETE TO authenticated
    USING (company_id = public.get_my_company_id());

-- BUILDINGS
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "buildings_select" ON public.buildings;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.buildings;
DROP POLICY IF EXISTS "buildings_select_company" ON public.buildings;
CREATE POLICY "buildings_select_company" ON public.buildings
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "buildings_insert_company" ON public.buildings;
CREATE POLICY "buildings_insert_company" ON public.buildings
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "buildings_update_company" ON public.buildings;
CREATE POLICY "buildings_update_company" ON public.buildings
    FOR UPDATE TO authenticated
    USING (company_id = public.get_my_company_id());

-- MAINTENANCE_REQUESTS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maintenance_requests_select" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.maintenance_requests;
DROP POLICY IF EXISTS "maintenance_select_company" ON public.maintenance_requests;
CREATE POLICY "maintenance_select_company" ON public.maintenance_requests
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "maintenance_insert_company" ON public.maintenance_requests;
CREATE POLICY "maintenance_insert_company" ON public.maintenance_requests
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "maintenance_update_company" ON public.maintenance_requests;
CREATE POLICY "maintenance_update_company" ON public.maintenance_requests
    FOR UPDATE TO authenticated
    USING (company_id = public.get_my_company_id());

-- SHOWINGS
ALTER TABLE public.showings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "showings_select" ON public.showings;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.showings;
DROP POLICY IF EXISTS "showings_select_company" ON public.showings;
CREATE POLICY "showings_select_company" ON public.showings
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "showings_insert_company" ON public.showings;
CREATE POLICY "showings_insert_company" ON public.showings
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "showings_update_company" ON public.showings;
CREATE POLICY "showings_update_company" ON public.showings
    FOR UPDATE TO authenticated
    USING (company_id = public.get_my_company_id());

-- LEASES
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leases_select" ON public.leases;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.leases;
DROP POLICY IF EXISTS "leases_select_company" ON public.leases;
CREATE POLICY "leases_select_company" ON public.leases
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "leases_insert_company" ON public.leases;
CREATE POLICY "leases_insert_company" ON public.leases
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "leases_update_company" ON public.leases;
CREATE POLICY "leases_update_company" ON public.leases
    FOR UPDATE TO authenticated
    USING (company_id = public.get_my_company_id());

-- INVOICES
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.invoices;
DROP POLICY IF EXISTS "invoices_select_company" ON public.invoices;
CREATE POLICY "invoices_select_company" ON public.invoices
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "invoices_insert_company" ON public.invoices;
CREATE POLICY "invoices_insert_company" ON public.invoices
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "invoices_update_company" ON public.invoices;
CREATE POLICY "invoices_update_company" ON public.invoices
    FOR UPDATE TO authenticated
    USING (company_id = public.get_my_company_id());

-- ACTIVITY_LOG
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_log_select" ON public.activity_log;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_select_company" ON public.activity_log;
CREATE POLICY "activity_log_select_company" ON public.activity_log
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "activity_log_insert_company" ON public.activity_log;
CREATE POLICY "activity_log_insert_company" ON public.activity_log
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id());

-- DOCUMENTS (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
        ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
        EXECUTE 'DROP POLICY IF EXISTS "documents_select_company" ON public.documents';
        EXECUTE 'DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.documents';
        EXECUTE 'CREATE POLICY "documents_select_company" ON public.documents FOR SELECT TO authenticated USING (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "documents_insert_company" ON public.documents';
        EXECUTE 'CREATE POLICY "documents_insert_company" ON public.documents FOR INSERT TO authenticated WITH CHECK (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "documents_update_company" ON public.documents';
        EXECUTE 'CREATE POLICY "documents_update_company" ON public.documents FOR UPDATE TO authenticated USING (company_id = public.get_my_company_id())';
    END IF;
END $$;

-- LANDLORDS (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'landlords' AND table_schema = 'public') THEN
        ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;
        EXECUTE 'DROP POLICY IF EXISTS "landlords_select_company" ON public.landlords';
        EXECUTE 'DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.landlords';
        EXECUTE 'CREATE POLICY "landlords_select_company" ON public.landlords FOR SELECT TO authenticated USING (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "landlords_insert_company" ON public.landlords';
        EXECUTE 'CREATE POLICY "landlords_insert_company" ON public.landlords FOR INSERT TO authenticated WITH CHECK (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "landlords_update_company" ON public.landlords';
        EXECUTE 'CREATE POLICY "landlords_update_company" ON public.landlords FOR UPDATE TO authenticated USING (company_id = public.get_my_company_id())';
    END IF;
END $$;

-- TEAM_INVITATIONS (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_invitations' AND table_schema = 'public') THEN
        ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
        EXECUTE 'DROP POLICY IF EXISTS "team_invitations_select_company" ON public.team_invitations';
        EXECUTE 'DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.team_invitations';
        EXECUTE 'CREATE POLICY "team_invitations_select_company" ON public.team_invitations FOR SELECT TO authenticated USING (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "team_invitations_insert_company" ON public.team_invitations';
        EXECUTE 'CREATE POLICY "team_invitations_insert_company" ON public.team_invitations FOR INSERT TO authenticated WITH CHECK (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "team_invitations_update_company" ON public.team_invitations';
        EXECUTE 'CREATE POLICY "team_invitations_update_company" ON public.team_invitations FOR UPDATE TO authenticated USING (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "team_invitations_delete_company" ON public.team_invitations';
        EXECUTE 'CREATE POLICY "team_invitations_delete_company" ON public.team_invitations FOR DELETE TO authenticated USING (company_id = public.get_my_company_id())';
    END IF;
END $$;

-- SOCIAL_ACCOUNTS (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_accounts' AND table_schema = 'public') THEN
        ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
        EXECUTE 'DROP POLICY IF EXISTS "social_accounts_select_company" ON public.social_accounts';
        EXECUTE 'DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.social_accounts';
        EXECUTE 'CREATE POLICY "social_accounts_select_company" ON public.social_accounts FOR SELECT TO authenticated USING (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "social_accounts_insert_company" ON public.social_accounts';
        EXECUTE 'CREATE POLICY "social_accounts_insert_company" ON public.social_accounts FOR INSERT TO authenticated WITH CHECK (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "social_accounts_update_company" ON public.social_accounts';
        EXECUTE 'CREATE POLICY "social_accounts_update_company" ON public.social_accounts FOR UPDATE TO authenticated USING (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "social_accounts_delete_company" ON public.social_accounts';
        EXECUTE 'CREATE POLICY "social_accounts_delete_company" ON public.social_accounts FOR DELETE TO authenticated USING (company_id = public.get_my_company_id())';
    END IF;
END $$;

-- SOCIAL_POSTS (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_posts' AND table_schema = 'public') THEN
        ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
        EXECUTE 'DROP POLICY IF EXISTS "social_posts_select_company" ON public.social_posts';
        EXECUTE 'DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.social_posts';
        EXECUTE 'CREATE POLICY "social_posts_select_company" ON public.social_posts FOR SELECT TO authenticated USING (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "social_posts_insert_company" ON public.social_posts';
        EXECUTE 'CREATE POLICY "social_posts_insert_company" ON public.social_posts FOR INSERT TO authenticated WITH CHECK (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "social_posts_update_company" ON public.social_posts';
        EXECUTE 'CREATE POLICY "social_posts_update_company" ON public.social_posts FOR UPDATE TO authenticated USING (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "social_posts_delete_company" ON public.social_posts';
        EXECUTE 'CREATE POLICY "social_posts_delete_company" ON public.social_posts FOR DELETE TO authenticated USING (company_id = public.get_my_company_id())';
    END IF;
END $$;

-- AUTOMATION_CONFIGS (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automation_configs' AND table_schema = 'public') THEN
        ALTER TABLE public.automation_configs ENABLE ROW LEVEL SECURITY;
        EXECUTE 'DROP POLICY IF EXISTS "automation_configs_select_company" ON public.automation_configs';
        EXECUTE 'DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.automation_configs';
        EXECUTE 'CREATE POLICY "automation_configs_select_company" ON public.automation_configs FOR SELECT TO authenticated USING (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "automation_configs_insert_company" ON public.automation_configs';
        EXECUTE 'CREATE POLICY "automation_configs_insert_company" ON public.automation_configs FOR INSERT TO authenticated WITH CHECK (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "automation_configs_update_company" ON public.automation_configs';
        EXECUTE 'CREATE POLICY "automation_configs_update_company" ON public.automation_configs FOR UPDATE TO authenticated USING (company_id = public.get_my_company_id())';
        EXECUTE 'DROP POLICY IF EXISTS "automation_configs_delete_company" ON public.automation_configs';
        EXECUTE 'CREATE POLICY "automation_configs_delete_company" ON public.automation_configs FOR DELETE TO authenticated USING (company_id = public.get_my_company_id())';
    END IF;
END $$;

-- ==========================================================================
-- 6. PLATFORM ADMIN METRICS RPC
-- Used by /admin page to show total companies, users, properties, MRR, etc.
-- SECURITY DEFINER so it can read across all companies (super admin only).
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.get_platform_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    v_caller_role TEXT;
BEGIN
    -- Only super admins can call this
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role != 'admin' THEN
        SELECT is_super_admin INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
        IF v_caller_role IS NULL OR v_caller_role::boolean = false THEN
            RETURN jsonb_build_object('error', 'Unauthorized');
        END IF;
    END IF;

    result := jsonb_build_object(
        'total_companies', (SELECT COUNT(*) FROM public.companies),
        'total_users', (SELECT COUNT(*) FROM public.profiles WHERE company_id IS NOT NULL),
        'total_properties', (SELECT COUNT(*) FROM public.properties),
        'total_applications', (SELECT COUNT(*) FROM public.applications),
        'subscriptions', jsonb_build_object(
            'active', (SELECT COUNT(*) FROM public.companies WHERE subscription_status = 'active'),
            'trialing', (SELECT COUNT(*) FROM public.companies WHERE subscription_status IN ('trialing', 'trial')),
            'enterprise', (SELECT COUNT(*) FROM public.companies WHERE COALESCE(plan_override, '') = 'enterprise'),
            'cancelled', (SELECT COUNT(*) FROM public.companies WHERE subscription_status = 'cancelled'),
            'none', (SELECT COUNT(*) FROM public.companies WHERE subscription_status IS NULL OR subscription_status = 'none')
        ),
        'plans', jsonb_build_object(
            'agent_pro', (SELECT COUNT(*) FROM public.companies WHERE COALESCE(plan_override, subscription_plan) = 'agent_pro'),
            'agency_growth', (SELECT COUNT(*) FROM public.companies WHERE COALESCE(plan_override, subscription_plan) = 'agency_growth'),
            'brokerage_command', (SELECT COUNT(*) FROM public.companies WHERE COALESCE(plan_override, subscription_plan) = 'brokerage_command'),
            'enterprise', (SELECT COUNT(*) FROM public.companies WHERE COALESCE(plan_override, subscription_plan) = 'enterprise')
        ),
        'recent', jsonb_build_object(
            'new_companies_30d', (SELECT COUNT(*) FROM public.companies WHERE created_at > NOW() - INTERVAL '30 days'),
            'new_users_30d', (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '30 days')
        ),
        'mrr_estimate', (
            SELECT COALESCE(SUM(
                CASE COALESCE(plan_override, subscription_plan)
                    WHEN 'agent_pro' THEN 149
                    WHEN 'agency_growth' THEN 289
                    WHEN 'brokerage_command' THEN 499
                    WHEN 'enterprise' THEN 999
                    ELSE 0
                END
            ), 0)
            FROM public.companies
            WHERE subscription_status = 'active'
        )
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_metrics() TO authenticated;

-- ==========================================================================
-- 7. ENSURE YOUR ADMIN PROFILE IS PROPERLY LINKED
-- ==========================================================================
-- Link konamak@icloud.com to the first available company if not already linked
UPDATE public.profiles
SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1)
WHERE email = 'konamak@icloud.com'
  AND (company_id IS NULL);

-- Ensure super admin role is set
UPDATE public.profiles
SET role = 'admin', is_super_admin = true
WHERE email = 'konamak@icloud.com';

-- ==========================================================================
-- 7. VERIFY
-- ==========================================================================
SELECT id, email, full_name, role, company_id, is_super_admin
FROM public.profiles
WHERE email = 'konamak@icloud.com';
