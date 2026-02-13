-- ==========================================================
-- PROPFLOW PRODUCTION ENGINE (V4 - SYMBIOTIC & PERFORMANCE)
-- ==========================================================

-- 1. ENSURE SCHEMA INTEGRITY
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

-- 2. DASHBOARD STATS ENGINE (V4 - HIGH PRECISION)
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
    v_team_members INT;
    v_upcoming_showings INT;
BEGIN
    -- Property Counts
    SELECT count(*) INTO v_total_props FROM properties WHERE company_id = p_company_id;
    SELECT count(*) INTO v_rented_props FROM properties WHERE company_id = p_company_id AND status = 'rented';
    SELECT count(*) INTO v_available_props FROM properties WHERE company_id = p_company_id AND status = 'available';
    
    -- Application Counts
    SELECT count(*) INTO v_total_apps FROM applications WHERE company_id = p_company_id;
    SELECT count(*) INTO v_pending_apps FROM applications WHERE company_id = p_company_id AND (status = 'pending' OR status = 'new' OR status = 'submitted');
    
    -- Maintenance Counts
    SELECT count(*) INTO v_open_maint FROM maintenance_requests WHERE company_id = p_company_id AND (status != 'completed' AND status != 'cancelled');
    
    -- Team Count
    SELECT count(*) INTO v_team_members FROM profiles WHERE company_id = p_company_id;
    
    -- Showings
    SELECT count(*) INTO v_upcoming_showings 
    FROM showings 
    WHERE company_id = p_company_id 
    AND status = 'scheduled' 
    AND (scheduled_date >= CURRENT_DATE);

    -- TOTAL REVENUE (Precision check: Sum of all paid invoices for THIS MONTH)
    -- We look at 'updated_at' OR 'created_at' to be as inclusive as possible
    SELECT COALESCE(sum(total), 0) INTO v_total_revenue 
    FROM invoices 
    WHERE company_id = p_company_id 
    AND (status = 'paid' OR status = 'Paid')
    AND (
        updated_at >= date_trunc('month', now()) 
        OR created_at >= date_trunc('month', now())
        OR updated_at >= (now() - interval '30 days') -- Fallback: trailing 30 days if month is empty
    );

    -- Occupancy
    IF v_total_props > 0 THEN
        v_occupancy_rate := (v_rented_props::float / v_total_props::float) * 100;
    ELSE
        v_occupancy_rate := 0;
    END IF;

    -- Build Result
    result = jsonb_build_object(
        'totalProperties', v_total_props,
        'availableProperties', v_available_props,
        'rentedProperties', v_rented_props,
        'totalApplications', v_total_apps,
        'pendingApplications', v_pending_apps,
        'totalMonthlyRevenue', v_total_revenue,
        'monthlyRevenue', v_total_revenue,
        'teamMembers', v_team_members,
        'openMaintenance', v_open_maint,
        'upcomingShowings', v_upcoming_showings,
        'occupancy_rate', ROUND(v_occupancy_rate::numeric, 1),
        'recent_activity', (
            SELECT COALESCE(jsonb_agg(act), '[]'::jsonb)
            FROM (
                SELECT a.id, a.action, a.entity_type, a.details as details, a.created_at, 
                       jsonb_build_object('full_name', p.full_name, 'avatar_url', p.avatar_url, 'email', p.email) as user
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

-- 3. SYMBIOTIC LOGGING TRIGGERS (Safe & Non-Recursive)

-- A. Invoices (Revenue Tracking)
CREATE OR REPLACE FUNCTION log_invoice_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF (LOWER(NEW.status) = 'paid' AND (OLD.status IS NULL OR LOWER(OLD.status) != 'paid')) THEN
        INSERT INTO activity_log (company_id, user_id, action, entity_type, entity_id, details)
        VALUES (
            NEW.company_id,
            NEW.created_by,
            'paid',
            'invoices',
            NEW.id,
            jsonb_build_object(
                'description', 'Invoice #' || COALESCE(NEW.invoice_number, NEW.id::text) || ' was paid.',
                'title', 'Invoice Paid',
                'amount', NEW.total,
                'recipient', NEW.recipient_name
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_log_invoice_payment ON invoices;
CREATE TRIGGER tr_log_invoice_payment
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION log_invoice_payment();

-- B. Leases (Activity Tracking)
CREATE OR REPLACE FUNCTION log_lease_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO activity_log (company_id, user_id, action, entity_type, entity_id, details)
        VALUES (NEW.company_id, NEW.created_by, 'created', 'leases', NEW.id, 
                jsonb_build_object('description', 'New lease created for ' || NEW.tenant_name, 'title', NEW.tenant_name));
    ELSIF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        INSERT INTO activity_log (company_id, user_id, action, entity_type, entity_id, details)
        VALUES (NEW.company_id, NEW.created_by, 'status_change', 'leases', NEW.id, 
                jsonb_build_object('description', 'Lease for ' || NEW.tenant_name || ' changed to ' || NEW.status, 'title', NEW.tenant_name));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_log_lease_changes ON leases;
CREATE TRIGGER tr_log_lease_changes
    AFTER INSERT OR UPDATE ON leases
    FOR EACH ROW
    EXECUTE FUNCTION log_lease_changes();

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_invoices_paid_updated ON invoices(company_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_unified ON activity_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leases_company_status ON leases(company_id, status);
CREATE INDEX IF NOT EXISTS idx_maint_company_status ON maintenance_requests(company_id, status);

SELECT 'PRODUCTION ENGINE V4 ACTIVATED' as status;
