-- =======================================================================
-- CANONICAL_SCHEMA_V1.sql
-- This is the ONLY schema script to run. All previous scripts are superseded:
-- CRITICAL_FIX_2026.sql, FINAL_REPAIR.sql, FINAL_PRODUCTION_SETUP.sql,
-- DASHBOARD_PERFORMANCE_OPTIMIZATION.sql, PRODUCTION_ENGINE_V7.sql,
-- production_stabilization.sql, emergency_restore_konamak.sql
-- =======================================================================
-- 1. DROP ALL VARIANTS OF get_enhanced_dashboard_stats
DROP FUNCTION IF EXISTS public.get_enhanced_dashboard_stats(UUID);
DROP FUNCTION IF EXISTS public.get_enhanced_dashboard_stats(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.get_enhanced_dashboard_stats(UUID, TEXT);
-- 2. CREATE ONE CANONICAL VERSION
CREATE OR REPLACE FUNCTION public.get_enhanced_dashboard_stats(
        p_company_id UUID,
        p_user_id UUID DEFAULT NULL,
        p_is_landlord BOOLEAN DEFAULT FALSE
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSONB;
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
v_total_revenue NUMERIC;
v_total_monthly_rent NUMERIC;
v_occupancy_rate NUMERIC;
v_current_week_props INTEGER;
v_last_week_props INTEGER;
v_current_week_apps INTEGER;
v_last_week_apps INTEGER;
v_one_week_ago TIMESTAMPTZ := NOW() - INTERVAL '7 days';
v_two_weeks_ago TIMESTAMPTZ := NOW() - INTERVAL '14 days';
BEGIN -- Property Counts
SELECT COUNT(*),
    COUNT(*) FILTER (
        WHERE status = 'available'
            OR status = 'active'
    ),
    COUNT(*) FILTER (
        WHERE status = 'rented'
    ) INTO v_total_props,
    v_available_props,
    v_rented_props
FROM public.properties
WHERE company_id = p_company_id;
-- Application Counts
SELECT COUNT(*),
    COUNT(*) FILTER (
        WHERE status IN ('new', 'submitted', 'screening', 'pending')
    ) INTO v_total_apps,
    v_pending_apps
FROM public.applications
WHERE company_id = p_company_id;
-- Open Maintenance
SELECT COUNT(*) INTO v_open_maint
FROM public.maintenance_requests
WHERE company_id = p_company_id
    AND status NOT IN ('completed', 'cancelled', 'resolved');
-- Team & Structural
SELECT COUNT(*) INTO v_team_members
FROM public.profiles
WHERE company_id = p_company_id;
SELECT COUNT(*) INTO v_total_areas
FROM public.areas
WHERE company_id = p_company_id;
SELECT COUNT(*) INTO v_total_buildings
FROM public.buildings
WHERE company_id = p_company_id;
-- Upcoming Showings (using scheduled_date)
SELECT COUNT(*) INTO v_upcoming_showings
FROM public.showings
WHERE company_id = p_company_id
    AND scheduled_date >= CURRENT_DATE
    AND status NOT IN ('cancelled', 'no_show');
-- Total Revenue (paid invoices this month)
SELECT COALESCE(SUM(total), 0) INTO v_total_revenue
FROM public.invoices
WHERE company_id = p_company_id
    AND status IN ('paid', 'Paid', 'settled')
    AND (
        paid_at >= DATE_TRUNC('month', NOW())
        OR (
            paid_at IS NULL
            AND updated_at >= DATE_TRUNC('month', NOW())
        )
    );
-- Total Monthly Rent (from active leases)
BEGIN
SELECT COALESCE(SUM(monthly_rent), 0) INTO v_total_monthly_rent
FROM public.leases
WHERE company_id = p_company_id
    AND status IN ('active', 'Active');
EXCEPTION
WHEN undefined_column
OR undefined_table THEN -- Fallback to property rent if leases table/column missing or failing
SELECT COALESCE(SUM(rent), 0) INTO v_total_monthly_rent
FROM public.properties
WHERE company_id = p_company_id
    AND status = 'rented';
END;
-- Occupancy Rate
IF v_total_props > 0 THEN v_occupancy_rate := ROUND(
    (v_rented_props::NUMERIC / v_total_props::NUMERIC) * 100,
    1
);
ELSE v_occupancy_rate := 0;
END IF;
-- Trends
SELECT COUNT(*) INTO v_current_week_props
FROM public.properties
WHERE company_id = p_company_id
    AND created_at >= v_one_week_ago;
SELECT COUNT(*) INTO v_last_week_props
FROM public.properties
WHERE company_id = p_company_id
    AND created_at >= v_two_weeks_ago
    AND created_at < v_one_week_ago;
SELECT COUNT(*) INTO v_current_week_apps
FROM public.applications
WHERE company_id = p_company_id
    AND created_at >= v_one_week_ago;
SELECT COUNT(*) INTO v_last_week_apps
FROM public.applications
WHERE company_id = p_company_id
    AND created_at >= v_two_weeks_ago
    AND created_at < v_one_week_ago;
-- Build Final JSON
result := jsonb_build_object(
    'totalProperties',
    v_total_props,
    'availableProperties',
    v_available_props,
    'rentedProperties',
    v_rented_props,
    'totalApplications',
    v_total_apps,
    'pendingApplications',
    v_pending_apps,
    'openMaintenance',
    v_open_maint,
    'totalAreas',
    v_total_areas,
    'totalBuildings',
    v_total_buildings,
    'teamMembers',
    v_team_members,
    'upcomingShowings',
    v_upcoming_showings,
    'totalMonthlyRevenue',
    v_total_revenue,
    'totalMonthlyRent',
    v_total_monthly_rent,
    'occupancyRate',
    v_occupancy_rate,
    'currentWeekProps',
    v_current_week_props,
    'lastWeekProps',
    v_last_week_props,
    'currentWeekApps',
    v_current_week_apps,
    'lastWeekApps',
    v_last_week_apps,
    'recentActivity',
    (
        SELECT COALESCE(jsonb_agg(act), '[]'::jsonb)
        FROM (
                SELECT a.id,
                    a.action,
                    a.entity_type,
                    a.details,
                    a.created_at,
                    jsonb_build_object(
                        'full_name',
                        p.full_name,
                        'avatar_url',
                        p.avatar_url,
                        'email',
                        p.email
                    ) as user
                FROM public.activity_log a
                    LEFT JOIN public.profiles p ON a.user_id = p.id
                WHERE a.company_id = p_company_id
                ORDER BY a.created_at DESC
                LIMIT 10
            ) act
    )
);
RETURN result;
END;
$$;
-- 3. ADD paid_at COLUMN AND TRIGGER
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
UPDATE public.invoices
SET paid_at = COALESCE(updated_at, created_at)
WHERE status IN ('paid', 'Paid')
    AND paid_at IS NULL;
CREATE OR REPLACE FUNCTION public.handle_invoice_paid_at() RETURNS TRIGGER AS $$ BEGIN IF (
        NEW.status IN ('paid', 'Paid')
        AND (
            OLD.status NOT IN ('paid', 'Paid')
            OR OLD.status IS NULL
        )
    ) THEN NEW.paid_at := NOW();
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tr_invoice_paid_at ON public.invoices;
CREATE TRIGGER tr_invoice_paid_at BEFORE
UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.handle_invoice_paid_at();
-- 4. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.get_enhanced_dashboard_stats(UUID, UUID, BOOLEAN) TO authenticated,
    service_role;