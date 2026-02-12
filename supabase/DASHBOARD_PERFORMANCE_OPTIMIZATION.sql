-- ==========================================================
-- PROPFLOW PRODUCTION PERFORMANCE ENGINE (V3 - FIXED)
-- ==========================================================

-- 1. Optimized Dashboard Stats Engine with Multi-Role Support & Parameter Alignment
-- FIXED: Corrected showings table date comparison (scheduled_date instead of start_time)
DROP FUNCTION IF EXISTS get_enhanced_dashboard_stats(UUID);
DROP FUNCTION IF EXISTS get_enhanced_dashboard_stats(UUID, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION get_enhanced_dashboard_stats(
    p_company_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_is_landlord BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    v_total_revenue NUMERIC;
    v_occupancy_rate NUMERIC;
    v_total_props INT;
    v_rented_props INT;
    v_available_props INT;
    v_total_apps INT;
    v_pending_apps INT;
    v_open_maint INT;
    v_total_areas INT;
    v_total_buildings INT;
    v_team_members INT;
    v_upcoming_showings INT;
BEGIN
    -- Property Counts
    SELECT count(*) INTO v_total_props FROM properties WHERE company_id = p_company_id;
    SELECT count(*) INTO v_rented_props FROM properties WHERE company_id = p_company_id AND status = 'rented';
    SELECT count(*) INTO v_available_props FROM properties WHERE company_id = p_company_id AND status = 'available';
    
    -- Application Counts
    SELECT count(*) INTO v_total_apps FROM applications WHERE company_id = p_company_id;
    SELECT count(*) INTO v_pending_apps FROM applications WHERE company_id = p_company_id AND (status = 'pending' OR status = 'new');
    
    -- Maintenance Counts
    SELECT count(*) INTO v_open_maint FROM maintenance_requests WHERE company_id = p_company_id AND (status = 'pending' OR status = 'in_progress');
    
    -- Organizational Counts
    SELECT count(*) INTO v_total_areas FROM areas WHERE company_id = p_company_id;
    SELECT count(*) INTO v_total_buildings FROM buildings WHERE company_id = p_company_id;
    SELECT count(*) INTO v_team_members FROM profiles WHERE company_id = p_company_id;
    
    -- Showing Counts (Upcoming)
    -- FIXED: Changed 'start_time' to 'scheduled_date' to match actual schema
    SELECT count(*) INTO v_upcoming_showings 
    FROM showings 
    WHERE company_id = p_company_id 
    AND status = 'scheduled' 
    AND scheduled_date >= CURRENT_DATE;

    -- TOTAL COLLECTED REVENUE (Paid Invoices this month)
    SELECT COALESCE(sum(total), 0) INTO v_total_revenue 
    FROM invoices 
    WHERE company_id = p_company_id 
    AND status = 'paid' 
    AND (
        updated_at >= date_trunc('month', now()) 
        OR created_at >= date_trunc('month', now())
    );

    -- Occupancy Calculation
    IF v_total_props > 0 THEN
        v_occupancy_rate := (v_rented_props::float / v_total_props::float) * 100;
    ELSE
        v_occupancy_rate := 0;
    END IF;

    -- Consolidated Result
    result = jsonb_build_object(
        'totalProperties', v_total_props,
        'availableProperties', v_available_props,
        'rentedProperties', v_rented_props,
        'totalApplications', v_total_apps,
        'pendingApplications', v_pending_apps,
        'totalMonthlyRevenue', v_total_revenue,
        'monthlyRevenue', v_total_revenue,
        'teamMembers', v_team_members,
        'totalAreas', v_total_areas,
        'totalBuildings', v_total_buildings,
        'openMaintenance', v_open_maint,
        'upcomingShowings', v_upcoming_showings,
        'occupancy_rate', ROUND(v_occupancy_rate::numeric, 1),
        'recent_activity', (
            SELECT COALESCE(jsonb_agg(act), '[]'::jsonb)
            FROM (
                SELECT a.id, a.action, a.entity_type, a.metadata, a.created_at, 
                       jsonb_build_object('full_name', p.full_name, 'avatar_url', p.avatar_url) as user
                FROM activity_log a
                LEFT JOIN profiles p ON a.user_id = p.id
                WHERE a.company_id = p_company_id
                ORDER BY a.created_at DESC
                LIMIT 10
            ) act
        )
    );

    RETURN result;
END;
$$;

-- 2. Critical Performance Indexes
CREATE INDEX IF NOT EXISTS idx_properties_company_status ON properties(company_id, status);
CREATE INDEX IF NOT EXISTS idx_leases_company_status ON leases(company_id, status);
CREATE INDEX IF NOT EXISTS idx_apps_company_status ON applications(company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_company_status_dates ON invoices(company_id, status, updated_at, created_at);
CREATE INDEX IF NOT EXISTS idx_maint_company_status ON maintenance_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_activity_company_created ON activity_log(company_id, created_at DESC);
-- FIXED: Changed 'start_time' to 'scheduled_date'
CREATE INDEX IF NOT EXISTS idx_showings_company_date ON showings(company_id, scheduled_date);
