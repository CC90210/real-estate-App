-- ==========================================================
-- PROPFLOW TOTAL SYSTEM REPAIR (PRODUCTION ENGINE V6)
-- ==========================================================

-- 1. STRIPE CONNECT SCHEMA FIX 
-- Create the dedicated table mapping companies to Stripe Connect accounts
CREATE TABLE IF NOT EXISTS public.stripe_connect_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) UNIQUE,
    stripe_account_id TEXT NOT NULL UNIQUE,
    details_submitted BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    charges_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Stripe Connect
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access stripe_connect_accounts" ON public.stripe_connect_accounts;
CREATE POLICY "Company access stripe_connect_accounts" ON public.stripe_connect_accounts 
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.company_id = stripe_connect_accounts.company_id
    )
);

-- 2. ENHANCED DASHBOARD STATS (V6 - FULL METRICS)
CREATE OR REPLACE FUNCTION get_enhanced_dashboard_stats(
    p_company_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_is_landlord BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    v_total_areas INT;
    v_total_buildings INT;
BEGIN
    -- Property Counts
    SELECT count(*) INTO v_total_props FROM properties WHERE company_id = p_company_id;
    SELECT count(*) INTO v_rented_props FROM properties WHERE company_id = p_company_id AND status = 'rented';
    SELECT count(*) INTO v_available_props FROM properties WHERE company_id = p_company_id AND (status = 'available' OR status = 'active');
    
    -- Application Counts
    SELECT count(*) INTO v_total_apps FROM applications WHERE company_id = p_company_id;
    SELECT count(*) INTO v_pending_apps FROM applications WHERE company_id = p_company_id AND (status IN ('pending', 'new', 'submitted', 'screening'));
    
    -- Maintenance Counts
    SELECT count(*) INTO v_open_maint FROM maintenance_requests WHERE company_id = p_company_id AND (status NOT IN ('completed', 'cancelled', 'resolved'));
    
    -- Team Count
    SELECT count(*) INTO v_team_members FROM profiles WHERE company_id = p_company_id;

    -- Areas & Buildings (FIX FOR GETTING STARTED CHECKLIST)
    SELECT count(*) INTO v_total_areas FROM public.areas WHERE company_id = p_company_id;
    SELECT count(*) INTO v_total_buildings FROM public.buildings WHERE company_id = p_company_id;
    
    -- Showings
    SELECT count(*) INTO v_upcoming_showings 
    FROM showings 
    WHERE company_id = p_company_id 
    AND status IN ('scheduled', 'pending') 
    AND (scheduled_date >= CURRENT_DATE OR created_at >= now() - interval '24 hours');

    -- TOTAL REVENUE
    SELECT COALESCE(sum(total), 0) INTO v_total_revenue 
    FROM invoices 
    WHERE company_id = p_company_id 
    AND (LOWER(status) = 'paid' OR LOWER(status) = 'settled' OR LOWER(status) = 'completed')
    AND (
        updated_at >= date_trunc('month', now()) 
        OR created_at >= date_trunc('month', now())
    );

    -- Fallback: If month-to-date is $0, trailing 30 days
    IF v_total_revenue = 0 THEN
        SELECT COALESCE(sum(total), 0) INTO v_total_revenue 
        FROM invoices 
        WHERE company_id = p_company_id 
        AND (LOWER(status) = 'paid' OR LOWER(status) = 'settled')
        AND updated_at >= (now() - interval '30 days');
    END IF;

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
        'totalAreas', v_total_areas,
        'totalBuildings', v_total_buildings,
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

-- 3. ENSURE INDEXES FOR LATENCY
CREATE INDEX IF NOT EXISTS idx_leases_company_status ON public.leases(company_id, status);
CREATE INDEX IF NOT EXISTS idx_maint_company_status ON public.maintenance_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_activity_company_created ON public.activity_log(company_id, created_at DESC);

SELECT 'PRODUCTION ENGINE V6 ACTIVATED' as status;
