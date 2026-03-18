-- ==========================================================
-- PROPFLOW PRODUCTION ENGINE OPTIMIZATION & RECOVERY
-- ==========================================================

-- 1. Ensure Company Table has necessary Plan Columns
ALTER TABLE IF EXISTS companies
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'essentials',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS is_lifetime_access BOOLEAN DEFAULT FALSE;

-- 2. Create optimized dashboard stats function
-- This replaces 15 parallel network requests with 1 high-speed database call
CREATE OR REPLACE FUNCTION get_enhanced_dashboard_stats(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    v_total_rent NUMERIC;
    v_collected_rent NUMERIC;
    v_occupancy_rate NUMERIC;
    v_maintenance_count INT;
    v_pending_applications INT;
BEGIN
    -- Calculate Active Listings / Properties
    SELECT count(*) INTO v_maintenance_count FROM maintenance_requests WHERE company_id = p_company_id AND status = 'pending';
    
    -- Calculate Total Rent (from active leases)
    SELECT COALESCE(sum(rent_amount), 0) INTO v_total_rent 
    FROM leases 
    WHERE company_id = p_company_id AND status = 'active';

    -- Calculate Occupancy Rate
    SELECT (count(DISTINCT property_id)::float / GREATEST(count(id), 1)::float) * 100 
    INTO v_occupancy_rate 
    FROM properties 
    WHERE company_id = p_company_id;

    -- Aggregate Recent Activity (Last 5)
    result = jsonb_build_object(
        'stats', jsonb_build_object(
            'total_properties', (SELECT count(*) FROM properties WHERE company_id = p_company_id),
            'active_leases', (SELECT count(*) FROM leases WHERE company_id = p_company_id AND status = 'active'),
            'maintenance_requests', v_maintenance_count,
            'pending_apps', (SELECT count(*) FROM applications WHERE company_id = p_company_id AND status = 'pending'),
            'total_revenue', v_total_rent,
            'occupancy_rate', ROUND(v_occupancy_rate::numeric, 1)
        ),
        'recent_activity', (
            SELECT COALESCE(jsonb_agg(act), '[]'::jsonb)
            FROM (
                SELECT action, description, created_at, entity_type
                FROM activity_log
                WHERE company_id = p_company_id
                ORDER BY created_at DESC
                LIMIT 5
            ) act
        )
    );

    RETURN result;
END;
$$;

-- 3. Recovery Procedure for Enterprise/Lifetime Users
-- Use this if a specific user should have full platform access
-- USAGE: SELECT repair_owner_access('user@email.com');
CREATE OR REPLACE FUNCTION repair_owner_access(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
BEGIN
    SELECT id, company_id INTO v_user_id, v_company_id 
    FROM profiles 
    WHERE email = p_email 
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Upgrade Profile
        UPDATE profiles SET is_super_admin = TRUE, is_partner = TRUE WHERE id = v_user_id;
        
        -- Upgrade Company to Lifetime Enterprise
        IF v_company_id IS NOT NULL THEN
            UPDATE companies 
            SET subscription_plan = 'enterprise', 
                subscription_status = 'active', 
                is_lifetime_access = TRUE 
            WHERE id = v_company_id;
        END IF;
    END IF;
END;
$$;

-- 4. Initial Seed for specific user if needed (Optional)
-- SELECT repair_owner_access('User@example.com'); -- Replace with actual user email
