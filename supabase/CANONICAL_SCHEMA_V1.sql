-- This is the ONLY schema script that should be run. All previous scripts (CRITICAL_FIX_2026.sql, FINAL_REPAIR.sql, DASHBOARD_PERFORMANCE_OPTIMIZATION.sql, etc.) are superseded by this file.
-- ==========================================
-- PHASE 1: DASHBOARD STATS CANONICALIZATION
-- ==========================================
-- Drop ALL signature variants to prevent overload conflicts
DROP FUNCTION IF EXISTS public.get_enhanced_dashboard_stats(UUID);
DROP FUNCTION IF EXISTS public.get_enhanced_dashboard_stats(UUID, UUID, BOOLEAN);
-- Create the ONE canonical version
CREATE OR REPLACE FUNCTION public.get_enhanced_dashboard_stats(
        p_company_id UUID,
        p_user_id UUID DEFAULT NULL,
        p_is_landlord BOOLEAN DEFAULT FALSE
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_total_properties INT := 0;
v_available_properties INT := 0;
v_rented_properties INT := 0;
v_total_applications INT := 0;
v_pending_applications INT := 0;
v_open_maintenance INT := 0;
v_total_areas INT := 0;
v_total_buildings INT := 0;
v_team_members INT := 0;
v_upcoming_showings INT := 0;
v_total_monthly_revenue NUMERIC := 0;
v_total_monthly_rent NUMERIC := 0;
v_occupancy_rate NUMERIC := 0;
v_recent_activity JSONB := '[]'::JSONB;
BEGIN -- 1. Properties Context
SELECT COUNT(*),
    COALESCE(
        SUM(
            CASE
                WHEN status = 'available' THEN 1
                ELSE 0
            END
        ),
        0
    ),
    COALESCE(
        SUM(
            CASE
                WHEN status = 'rented' THEN 1
                ELSE 0
            END
        ),
        0
    ) INTO v_total_properties,
    v_available_properties,
    v_rented_properties
FROM properties
WHERE company_id = p_company_id
    AND (
        p_is_landlord IS FALSE
        OR landlord_id = p_user_id
    );
-- 2. Applications Context
SELECT COUNT(*),
    COALESCE(
        SUM(
            CASE
                WHEN status IN ('pending', 'new') THEN 1
                ELSE 0
            END
        ),
        0
    ) INTO v_total_applications,
    v_pending_applications
FROM applications
WHERE company_id = p_company_id;
-- 3. Maintenance Context
SELECT COUNT(*) INTO v_open_maintenance
FROM maintenance_requests
WHERE company_id = p_company_id
    AND status IN ('pending', 'in_progress', 'open');
-- 4. Infrastructure Context
SELECT COUNT(*) INTO v_total_areas
FROM areas
WHERE company_id = p_company_id;
SELECT COUNT(*) INTO v_total_buildings
FROM buildings
WHERE company_id = p_company_id;
-- 5. Team Context
SELECT COUNT(*) INTO v_team_members
FROM profiles
WHERE company_id = p_company_id;
-- 6. Showings Context (using expected scheduled_date instead of start_time)
SELECT COUNT(*) INTO v_upcoming_showings
FROM showings
WHERE company_id = p_company_id
    AND status = 'scheduled'
    AND scheduled_date >= CURRENT_DATE;
-- 7. Revenue Context (requires paid_at to have been created/backfilled)
SELECT COALESCE(SUM(amount), 0) INTO v_total_monthly_revenue
FROM invoices
WHERE company_id = p_company_id
    AND status = 'paid'
    AND (
        -- If paid_at exists, use it. Otherwise use fallback for safety, though Phase 1B/1C creates it.
        COALESCE(paid_at, updated_at) >= date_trunc('month', now())
    );
-- 8. Rent Context
SELECT COALESCE(SUM(rent_amount), 0) INTO v_total_monthly_rent
FROM leases
WHERE company_id = p_company_id
    AND status = 'active';
-- 9. Occupancy Rate
IF v_total_properties > 0 THEN v_occupancy_rate := ROUND(
    (
        v_rented_properties::NUMERIC / GREATEST(v_total_properties, 1)
    ) * 100,
    2
);
ELSE v_occupancy_rate := 0;
END IF;
-- 10. Recent Activity
SELECT COALESCE(jsonb_agg(log_entry), '[]'::JSONB) INTO v_recent_activity
FROM (
        SELECT to_jsonb(a) AS log_entry
        FROM activity_log a
        WHERE a.company_id = p_company_id
        ORDER BY a.created_at DESC
        LIMIT 10
    ) sub;
RETURN jsonb_build_object(
    'totalProperties',
    v_total_properties,
    'availableProperties',
    v_available_properties,
    'rentedProperties',
    v_rented_properties,
    'totalApplications',
    v_total_applications,
    'pendingApplications',
    v_pending_applications,
    'openMaintenance',
    v_open_maintenance,
    'totalAreas',
    v_total_areas,
    'totalBuildings',
    v_total_buildings,
    'teamMembers',
    v_team_members,
    'upcomingShowings',
    v_upcoming_showings,
    'totalMonthlyRevenue',
    v_total_monthly_revenue,
    'totalMonthlyRent',
    v_total_monthly_rent,
    'occupancyRate',
    v_occupancy_rate,
    'recentActivity',
    v_recent_activity
);
END;
$$;
-- ==========================================
-- PHASE 1B: ADD MISSING COLUMNS
-- ==========================================
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}';
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS is_lifetime_access BOOLEAN DEFAULT FALSE;
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS automation_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'enterprise';
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS plan_override TEXT;
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
-- ==========================================
-- PHASE 1C: BACKFILL paid_at FOR INVOICES
-- ==========================================
UPDATE public.invoices
SET paid_at = COALESCE(updated_at, created_at)
WHERE status = 'paid'
    AND paid_at IS NULL;
-- ==========================================
-- PHASE 1D: TRIGGER TO AUTO-SET paid_at
-- ==========================================
CREATE OR REPLACE FUNCTION public.set_invoice_paid_at() RETURNS TRIGGER AS $$ BEGIN IF NEW.status = 'paid'
    AND OLD.status != 'paid' THEN NEW.paid_at = NOW();
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tr_set_invoice_paid_at ON public.invoices;
CREATE TRIGGER tr_set_invoice_paid_at BEFORE
UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_invoice_paid_at();
-- ==========================================
-- PHASE 1E: GRANT PERMISSIONS
-- ==========================================
GRANT EXECUTE ON FUNCTION public.get_enhanced_dashboard_stats(UUID, UUID, BOOLEAN) TO authenticated,
    service_role;
GRANT USAGE ON SCHEMA public TO postgres,
    anon,
    authenticated,
    service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres,
    service_role;
GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- ==========================================
-- PHASE 1F: VERIFICATION QUERY
-- ==========================================
-- This should return exactly ONE row confirming the function exists with 3 parameters
-- SELECT routine_name, data_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name = 'get_enhanced_dashboard_stats';