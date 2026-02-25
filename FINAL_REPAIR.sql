-- ==============================================================================
-- 🚀 PROPFLOW DASHBOARD & LATENCY REPAIR ENGINE
-- ==============================================================================
-- 1. DROP THE OLD FUNCTIONS TO ENSURE CLEAN TYPE MATCHING
DROP FUNCTION IF EXISTS public.get_enhanced_dashboard_stats(uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.get_enhanced_dashboard_stats(uuid);
-- 2. REBUILD THE HIGH-SPEED RPC AGGREGATOR
-- This matches your useStats TypeScript interface EXACTLY, preventing 
-- the 13 expensive manual frontend queries from stalling out your database.
CREATE OR REPLACE FUNCTION public.get_enhanced_dashboard_stats(
        p_company_id UUID,
        p_user_id UUID DEFAULT NULL,
        p_is_landlord BOOLEAN DEFAULT FALSE
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE result JSONB;
v_total_properties INT;
v_available_properties INT;
v_rented_properties INT;
v_total_applications INT;
v_pending_applications INT;
v_total_monthly_revenue NUMERIC;
v_team_members INT;
v_total_areas INT;
v_total_buildings INT;
v_open_maintenance INT;
v_upcoming_showings INT;
v_total_monthly_rent NUMERIC;
v_month_start TIMESTAMPTZ;
BEGIN -- Determine current month logic for revenue
v_month_start := date_trunc('month', now());
-- Perform fast aggregated counts
SELECT count(id) INTO v_total_properties
FROM properties
WHERE company_id = p_company_id;
SELECT count(id) INTO v_available_properties
FROM properties
WHERE company_id = p_company_id
    AND status = 'available';
SELECT count(id) INTO v_rented_properties
FROM properties
WHERE company_id = p_company_id
    AND status = 'rented';
SELECT count(id) INTO v_total_applications
FROM applications
WHERE company_id = p_company_id;
SELECT count(id) INTO v_pending_applications
FROM applications
WHERE company_id = p_company_id
    AND status = 'pending';
SELECT count(id) INTO v_team_members
FROM profiles
WHERE company_id = p_company_id;
SELECT count(id) INTO v_total_areas
FROM areas
WHERE company_id = p_company_id;
SELECT count(id) INTO v_total_buildings
FROM buildings
WHERE company_id = p_company_id;
SELECT count(id) INTO v_open_maintenance
FROM maintenance_requests
WHERE company_id = p_company_id
    AND status IN ('open', 'in_progress');
SELECT count(id) INTO v_upcoming_showings
FROM showings
WHERE company_id = p_company_id
    AND showing_date >= now();
-- Process financial ledgers
SELECT COALESCE(sum(rent_amount), 0) INTO v_total_monthly_rent
FROM leases
WHERE company_id = p_company_id
    AND status = 'active';
SELECT COALESCE(sum(total), 0) INTO v_total_monthly_revenue
FROM invoices
WHERE company_id = p_company_id
    AND status = 'paid'
    AND (
        paid_at >= v_month_start
        OR updated_at >= v_month_start
        OR created_at >= v_month_start
    );
-- Assemble and return the validated JSON document
result = jsonb_build_object(
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
    'totalMonthlyRevenue',
    v_total_monthly_revenue,
    'monthlyRevenue',
    v_total_monthly_revenue,
    'teamMembers',
    v_team_members,
    'totalAreas',
    v_total_areas,
    'totalBuildings',
    v_total_buildings,
    'openMaintenance',
    v_open_maintenance,
    'upcomingShowings',
    v_upcoming_showings,
    'totalMonthlyRent',
    v_total_monthly_rent,
    'recent_activity',
    (
        SELECT COALESCE(jsonb_agg(a), '[]'::jsonb)
        FROM (
                SELECT al.id,
                    al.action,
                    al.entity_type,
                    al.details,
                    al.created_at,
                    jsonb_build_object(
                        'full_name',
                        p.full_name,
                        'avatar_url',
                        p.avatar_url,
                        'email',
                        p.email
                    ) as "user"
                FROM activity_log al
                    LEFT JOIN profiles p ON p.id = al.user_id
                WHERE al.company_id = p_company_id
                ORDER BY al.created_at DESC
                LIMIT 10
            ) a
    )
);
RETURN result;
END;
$$;
-- 3. ENSURE ALL CORE INDEXES EXIST FOR SUB-MILLISECOND QUERIES
CREATE INDEX IF NOT EXISTS idx_properties_cmp_sts ON properties(company_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_cmp_sts ON applications(company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_cmp_sts_dates ON invoices(
    company_id,
    status,
    paid_at,
    updated_at,
    created_at
);
CREATE INDEX IF NOT EXISTS idx_activity_log_cmp_date ON activity_log(company_id, created_at DESC);