-- PERFORMANCE_HARDENING_V1.sql
-- Optimizes activity log, invoices, and dashboard stats for production scale.
-- 1. ADD CRITICAL COMPOSITE INDEXES & SCHEMA UPDATES
ALTER TABLE public.activity_log
ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.activity_log
ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_activity_log_company_created ON public.activity_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_company_status_paid ON public.invoices(company_id, status, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_company_status_updated ON public.invoices(company_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_company_status_created ON public.applications(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_company_status_created ON public.properties(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leases_company_status ON public.leases(company_id, status);
-- 2. ENSURE paid_at IS FULLY POPULATED for historical data
UPDATE public.invoices
SET paid_at = COALESCE(updated_at, created_at)
WHERE status IN ('paid', 'Paid', 'settled')
    AND paid_at IS NULL;
-- 3. OPTIMIZED CANONICAL RPC
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
v_monthly_revenue NUMERIC;
v_lifetime_revenue NUMERIC;
v_total_monthly_rent NUMERIC;
v_occupancy_rate NUMERIC;
v_current_week_props INTEGER;
v_last_week_props INTEGER;
v_current_week_apps INTEGER;
v_last_week_apps INTEGER;
v_one_week_ago TIMESTAMPTZ := NOW() - INTERVAL '7 days';
v_two_weeks_ago TIMESTAMPTZ := NOW() - INTERVAL '14 days';
BEGIN -- Property Counts (Optimized)
SELECT COUNT(*),
    COUNT(*) FILTER (
        WHERE status IN ('available', 'active', 'listed')
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
-- Upcoming Showings
SELECT COUNT(*) INTO v_upcoming_showings
FROM public.showings
WHERE company_id = p_company_id
    AND scheduled_date >= CURRENT_DATE
    AND status NOT IN ('cancelled', 'no_show');
-- Revenue (This Month)
SELECT COALESCE(SUM(total), 0) INTO v_monthly_revenue
FROM public.invoices
WHERE company_id = p_company_id
    AND status IN ('paid', 'Paid', 'settled')
    AND paid_at >= DATE_TRUNC('month', NOW());
-- Revenue (Lifetime) - The user was asking for "total money collected"
SELECT COALESCE(SUM(total), 0) INTO v_lifetime_revenue
FROM public.invoices
WHERE company_id = p_company_id
    AND status IN ('paid', 'Paid', 'settled');
-- Total Monthly Rent (from active leases or fallback)
-- Using a direct check to avoid expensive exception blocks if possible
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'leases'
        AND table_schema = 'public'
) THEN
SELECT COALESCE(SUM(monthly_rent), 0) INTO v_total_monthly_rent
FROM public.leases
WHERE company_id = p_company_id
    AND status IN ('active', 'Active');
ELSE
SELECT COALESCE(SUM(rent), 0) INTO v_total_monthly_rent
FROM public.properties
WHERE company_id = p_company_id
    AND status = 'rented';
END IF;
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
    v_monthly_revenue,
    'totalLifetimeRevenue',
    v_lifetime_revenue,
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
                    a.description,
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