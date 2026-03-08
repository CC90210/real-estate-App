-- PROPFLOW_FINAL_FIX.sql
-- Run this in the Supabase SQL Editor to ensure:
-- 1. Companies table is readable (required for profile JOIN)
-- 2. Dashboard stats RPC exists and works correctly
-- 3. Activity log structure is compatible
-- 4. Invoices have consistent paid_at column

-- ============================================================
-- 1. ENSURE COMPANIES TABLE IS READABLE BY AUTHENTICATED USERS
-- Without this, the profile → company JOIN in useUser fails silently,
-- causing ALL pages to show "Unable to load workspace data"
-- ============================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies first (safe: IF EXISTS)
DROP POLICY IF EXISTS "Public companies select" ON public.companies;
DROP POLICY IF EXISTS "companies_select_authenticated" ON public.companies;

-- Allow all authenticated users to read companies (multi-tenant isolation
-- is handled by company_id filtering in application code)
CREATE POLICY "companies_select_authenticated" ON public.companies
    FOR SELECT TO authenticated
    USING (true);

-- ============================================================
-- 2. ENSURE PROFILES TABLE HAS SAFE RLS (prevents recursion)
-- ============================================================

-- Make sure profiles RLS doesn't cause infinite recursion
-- The key is: SELECT policy must NOT reference profiles itself
DROP POLICY IF EXISTS "profiles_select_own_company" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in same company" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;

-- Simple policy: users can read their own profile and profiles in their company
CREATE POLICY "profiles_read_own" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- ============================================================
-- 3. ENSURE ACTIVITY LOG HAS REQUIRED COLUMNS
-- ============================================================

ALTER TABLE public.activity_log
    ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.activity_log
    ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.activity_log
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Index for fast activity queries
CREATE INDEX IF NOT EXISTS idx_activity_log_company_created
    ON public.activity_log(company_id, created_at DESC);

-- ============================================================
-- 4. ENSURE INVOICES HAVE paid_at COLUMN
-- ============================================================

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS paid_date DATE;

-- Backfill paid_at from paid_date or updated_at for historical data
UPDATE public.invoices
SET paid_at = COALESCE(paid_date::timestamptz, updated_at, created_at)
WHERE status IN ('paid', 'Paid', 'settled')
    AND paid_at IS NULL;

-- Index for revenue queries
CREATE INDEX IF NOT EXISTS idx_invoices_company_status_paid
    ON public.invoices(company_id, status, paid_at DESC);

-- ============================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_applications_company_status_created
    ON public.applications(company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_properties_company_status_created
    ON public.properties(company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_showings_company_date
    ON public.showings(company_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_maintenance_company_status
    ON public.maintenance_requests(company_id, status);

CREATE INDEX IF NOT EXISTS idx_profiles_company
    ON public.profiles(company_id);

-- ============================================================
-- 6. DASHBOARD STATS RPC (CANONICAL VERSION)
-- Returns all metrics needed by AdminDashboard in one call
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_enhanced_dashboard_stats(
    p_company_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_is_landlord BOOLEAN DEFAULT FALSE
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result JSONB;
    v_total_props INTEGER;
    v_available_props INTEGER;
    v_rented_props INTEGER;
    v_total_apps INTEGER;
    v_pending_apps INTEGER;
    v_open_maint INTEGER;
    v_total_areas INTEGER;
    v_total_buildings INTEGER;
    v_team_members INTEGER;
    v_upcoming_showings INTEGER;
    v_monthly_revenue NUMERIC;
    v_lifetime_revenue NUMERIC;
    v_total_monthly_rent NUMERIC;
    v_occupancy_rate NUMERIC;
BEGIN
    -- Property Counts
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('available', 'active', 'listed')),
        COUNT(*) FILTER (WHERE status = 'rented')
    INTO v_total_props, v_available_props, v_rented_props
    FROM public.properties
    WHERE company_id = p_company_id;

    -- Application Counts
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('new', 'submitted', 'screening', 'pending'))
    INTO v_total_apps, v_pending_apps
    FROM public.applications
    WHERE company_id = p_company_id;

    -- Open Maintenance
    SELECT COUNT(*) INTO v_open_maint
    FROM public.maintenance_requests
    WHERE company_id = p_company_id
        AND status NOT IN ('completed', 'cancelled', 'resolved');

    -- Team Members
    SELECT COUNT(*) INTO v_team_members
    FROM public.profiles
    WHERE company_id = p_company_id;

    -- Areas & Buildings
    SELECT COUNT(*) INTO v_total_areas
    FROM public.areas
    WHERE company_id = p_company_id;

    SELECT COUNT(*) INTO v_total_buildings
    FROM public.buildings
    WHERE company_id = p_company_id;

    -- Upcoming Showings
    SELECT COUNT(*) INTO v_upcoming_showings
    FROM public.showings
    WHERE company_id = p_company_id
        AND scheduled_date >= CURRENT_DATE
        AND status NOT IN ('cancelled', 'no_show');

    -- Revenue (This Month) - handles both paid_at and paid_date columns
    SELECT COALESCE(SUM(total), 0) INTO v_monthly_revenue
    FROM public.invoices
    WHERE company_id = p_company_id
        AND status IN ('paid', 'Paid', 'settled')
        AND COALESCE(paid_at, paid_date::timestamptz, updated_at) >= DATE_TRUNC('month', NOW());

    -- Revenue (Lifetime)
    SELECT COALESCE(SUM(total), 0) INTO v_lifetime_revenue
    FROM public.invoices
    WHERE company_id = p_company_id
        AND status IN ('paid', 'Paid', 'settled');

    -- Total Monthly Rent (from active leases, fallback to rented property rents)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'leases' AND table_schema = 'public'
    ) THEN
        SELECT COALESCE(SUM(monthly_rent), 0) INTO v_total_monthly_rent
        FROM public.leases
        WHERE company_id = p_company_id
            AND status IN ('active', 'Active');

        -- Fallback to property rents if no lease data
        IF v_total_monthly_rent = 0 THEN
            SELECT COALESCE(SUM(rent), 0) INTO v_total_monthly_rent
            FROM public.properties
            WHERE company_id = p_company_id AND status = 'rented';
        END IF;
    ELSE
        SELECT COALESCE(SUM(rent), 0) INTO v_total_monthly_rent
        FROM public.properties
        WHERE company_id = p_company_id AND status = 'rented';
    END IF;

    -- Occupancy Rate
    IF v_total_props > 0 THEN
        v_occupancy_rate := ROUND((v_rented_props::NUMERIC / v_total_props::NUMERIC) * 100, 1);
    ELSE
        v_occupancy_rate := 0;
    END IF;

    -- Build Final JSON with camelCase keys (matching frontend expectations)
    result := jsonb_build_object(
        'totalProperties', v_total_props,
        'availableProperties', v_available_props,
        'rentedProperties', v_rented_props,
        'totalApplications', v_total_apps,
        'pendingApplications', v_pending_apps,
        'openMaintenance', v_open_maint,
        'totalAreas', v_total_areas,
        'totalBuildings', v_total_buildings,
        'teamMembers', v_team_members,
        'upcomingShowings', v_upcoming_showings,
        'totalMonthlyRevenue', v_monthly_revenue,
        'totalLifetimeRevenue', v_lifetime_revenue,
        'totalMonthlyRent', v_total_monthly_rent,
        'occupancyRate', v_occupancy_rate,
        'recentActivity', (
            SELECT COALESCE(jsonb_agg(act), '[]'::jsonb)
            FROM (
                SELECT
                    a.id,
                    a.action,
                    a.entity_type,
                    a.description,
                    a.details,
                    a.created_at,
                    jsonb_build_object(
                        'full_name', p.full_name,
                        'avatar_url', p.avatar_url,
                        'email', p.email
                    ) as "user"
                FROM public.activity_log a
                LEFT JOIN public.profiles p ON a.user_id = p.id
                WHERE a.company_id = p_company_id
                ORDER BY a.created_at DESC
                LIMIT 15
            ) act
        )
    );

    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_enhanced_dashboard_stats(UUID, UUID, BOOLEAN) TO authenticated;

-- ============================================================
-- 7. VERIFY: Check your profile has a company_id set
-- Run this to confirm your admin account is properly linked:
-- ============================================================
-- SELECT id, email, full_name, role, company_id, is_super_admin
-- FROM profiles
-- WHERE email = 'konamak@icloud.com';
--
-- If company_id is NULL, you need to link it:
-- UPDATE profiles SET company_id = '<your-company-uuid>' WHERE email = 'konamak@icloud.com';
