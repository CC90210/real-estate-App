-- ==============================================================================
-- PROPFLOW CRITICAL FIX SCRIPT - FEBRUARY 2026
-- ==============================================================================
-- This script fixes:
-- 1. Locked invoice/features for Enterprise Lifetime accounts
-- 2. Adds missing columns (feature_flags)
-- 3. Creates the missing get_enhanced_dashboard_stats RPC
-- 4. Ensures all permissions are correct
--
-- RUN THIS IN SUPABASE SQL EDITOR
-- ==============================================================================

-- ============================================
-- SECTION 1: FIX COMPANY TABLE STRUCTURE
-- ============================================

-- Add feature_flags column if missing (used by plan-limits.ts)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}';

-- Ensure is_lifetime_access column exists
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS is_lifetime_access BOOLEAN DEFAULT FALSE;

-- Ensure automation_enabled column exists
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS automation_enabled BOOLEAN DEFAULT TRUE;

-- ============================================
-- SECTION 2: FIX YOUR ACCOUNT ACCESS
-- ============================================
-- This grants Enterprise Lifetime access to ALL existing companies
-- (You can modify this to target specific companies if needed)

UPDATE public.companies
SET
    subscription_plan = 'enterprise',
    subscription_status = 'active',
    is_lifetime_access = TRUE,
    automation_enabled = TRUE,
    feature_flags = COALESCE(feature_flags, '{}') || '{"invoices": true, "analytics": true, "automations": true, "maintenance": true, "showings": true, "leases": true}'::jsonb
WHERE is_lifetime_access IS NULL OR is_lifetime_access = FALSE;

-- Verify the update (this will show in Results)
SELECT id, name, subscription_plan, subscription_status, is_lifetime_access, feature_flags
FROM public.companies
LIMIT 10;

-- ============================================
-- SECTION 3: CREATE ENHANCED DASHBOARD STATS RPC
-- ============================================
-- This RPC is called by stats-service.ts and returns all dashboard metrics in one call

CREATE OR REPLACE FUNCTION public.get_enhanced_dashboard_stats(
    p_company_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_is_landlord BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_props INTEGER;
    available_props INTEGER;
    rented_props INTEGER;
    total_apps INTEGER;
    pending_apps INTEGER;
    total_revenue NUMERIC;
    team_count INTEGER;
    area_count INTEGER;
    building_count INTEGER;
    open_maintenance INTEGER;
    upcoming_showings INTEGER;
    current_week_props INTEGER;
    last_week_props INTEGER;
    current_week_apps INTEGER;
    last_week_apps INTEGER;
BEGIN
    -- Property counts
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'available'),
        COUNT(*) FILTER (WHERE status = 'rented')
    INTO total_props, available_props, rented_props
    FROM public.properties
    WHERE company_id = p_company_id;

    -- Application counts
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('new', 'screening'))
    INTO total_apps, pending_apps
    FROM public.applications
    WHERE company_id = p_company_id;

    -- Monthly revenue from rented properties
    SELECT COALESCE(SUM(rent), 0)
    INTO total_revenue
    FROM public.properties
    WHERE company_id = p_company_id AND status = 'rented';

    -- Team member count
    SELECT COUNT(*)
    INTO team_count
    FROM public.profiles
    WHERE company_id = p_company_id;

    -- Area count (handle if table doesn't exist)
    BEGIN
        SELECT COUNT(*) INTO area_count FROM public.areas WHERE company_id = p_company_id;
    EXCEPTION WHEN undefined_table THEN
        area_count := 0;
    END;

    -- Building count (handle if table doesn't exist)
    BEGIN
        SELECT COUNT(*) INTO building_count FROM public.buildings WHERE company_id = p_company_id;
    EXCEPTION WHEN undefined_table THEN
        building_count := 0;
    END;

    -- Open maintenance requests
    BEGIN
        SELECT COUNT(*) INTO open_maintenance
        FROM public.maintenance_requests
        WHERE company_id = p_company_id AND status IN ('open', 'in_progress');
    EXCEPTION WHEN undefined_table THEN
        open_maintenance := 0;
    END;

    -- Upcoming showings (next 7 days)
    BEGIN
        SELECT COUNT(*) INTO upcoming_showings
        FROM public.showings
        WHERE company_id = p_company_id
        AND scheduled_at >= NOW()
        AND scheduled_at <= NOW() + INTERVAL '7 days'
        AND status != 'cancelled';
    EXCEPTION WHEN undefined_table THEN
        upcoming_showings := 0;
    END;

    -- Week-over-week trends
    SELECT COUNT(*) INTO current_week_props
    FROM public.properties
    WHERE company_id = p_company_id
    AND created_at >= date_trunc('week', NOW());

    SELECT COUNT(*) INTO last_week_props
    FROM public.properties
    WHERE company_id = p_company_id
    AND created_at >= date_trunc('week', NOW()) - INTERVAL '1 week'
    AND created_at < date_trunc('week', NOW());

    SELECT COUNT(*) INTO current_week_apps
    FROM public.applications
    WHERE company_id = p_company_id
    AND created_at >= date_trunc('week', NOW());

    SELECT COUNT(*) INTO last_week_apps
    FROM public.applications
    WHERE company_id = p_company_id
    AND created_at >= date_trunc('week', NOW()) - INTERVAL '1 week'
    AND created_at < date_trunc('week', NOW());

    -- Build result
    result := jsonb_build_object(
        'totalProperties', total_props,
        'availableProperties', available_props,
        'rentedProperties', rented_props,
        'totalApplications', total_apps,
        'pendingApplications', pending_apps,
        'totalMonthlyRevenue', total_revenue,
        'monthlyRevenue', total_revenue,
        'teamMembers', team_count,
        'totalAreas', area_count,
        'totalBuildings', building_count,
        'openMaintenance', open_maintenance,
        'upcomingShowings', upcoming_showings,
        'currentWeekProps', current_week_props,
        'lastWeekProps', last_week_props,
        'currentWeekApps', current_week_apps,
        'lastWeekApps', last_week_apps
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_enhanced_dashboard_stats(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_enhanced_dashboard_stats(UUID, UUID, BOOLEAN) TO service_role;

-- ============================================
-- SECTION 4: ENSURE SHOWINGS TABLE EXISTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.showings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.showings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Company isolation for showings" ON showings FOR ALL TO authenticated
    USING (company_id = get_my_company())
    WITH CHECK (company_id = get_my_company());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_showings_company_scheduled ON public.showings(company_id, scheduled_at);

-- ============================================
-- SECTION 5: ENSURE BUILDINGS TABLE EXISTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    address TEXT,
    total_units INTEGER DEFAULT 0,
    year_built INTEGER,
    amenities TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Company isolation for buildings" ON buildings FOR ALL TO authenticated
    USING (company_id = get_my_company())
    WITH CHECK (company_id = get_my_company());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- SECTION 6: FINAL PERMISSIONS REFRESH
-- ============================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT
    'CRITICAL FIX APPLIED SUCCESSFULLY' as status,
    (SELECT COUNT(*) FROM companies WHERE is_lifetime_access = TRUE) as lifetime_accounts,
    (SELECT COUNT(*) FROM companies WHERE subscription_plan = 'enterprise') as enterprise_accounts;
