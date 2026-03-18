-- =============================================
-- PROPFLOW DATA CONSISTENCY FIX
-- Run this in Supabase SQL Editor
-- Fixes: profile data, company linkage, and dashboard stats
-- =============================================

-- STEP 1: Check current state of your account
SELECT 
    '=== CURRENT PROFILE STATE ===' as section,
    p.id,
    u.email,
    p.full_name,
    p.role,
    p.company_id,
    p.is_super_admin,
    c.id as company_id_check,
    c.name as company_name,
    c.subscription_plan,
    c.subscription_status,
    c.is_lifetime_access
FROM profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN companies c ON c.id = p.company_id
WHERE u.email = 'konamak@icloud.com';

-- STEP 2: Fix profile - ensure full_name is set
UPDATE profiles
SET 
    full_name = COALESCE(NULLIF(full_name, ''), 'Carl Josh James'),
    role = COALESCE(role, 'admin'),
    is_super_admin = true
WHERE id IN (SELECT id FROM auth.users WHERE email = 'konamak@icloud.com');

-- STEP 3: Ensure company exists and is properly linked
-- First check if company exists
DO $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_existing_company_id UUID;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'konamak@icloud.com';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found!';
    END IF;
    
    -- Get current company_id from profile
    SELECT company_id INTO v_existing_company_id FROM profiles WHERE id = v_user_id;
    
    IF v_existing_company_id IS NULL THEN
        -- No company linked - create one
        INSERT INTO companies (name, subscription_plan, subscription_status, is_lifetime_access)
        VALUES ('PropFlow HQ', 'enterprise', 'active', true)
        RETURNING id INTO v_company_id;
        
        UPDATE profiles SET company_id = v_company_id WHERE id = v_user_id;
        RAISE NOTICE 'Created new company and linked to profile: %', v_company_id;
    ELSE
        -- Company exists, just ensure it has correct settings
        UPDATE companies
        SET 
            subscription_plan = 'enterprise',
            subscription_status = 'active',
            is_lifetime_access = true,
            name = COALESCE(NULLIF(name, ''), 'PropFlow HQ')
        WHERE id = v_existing_company_id;
        
        v_company_id := v_existing_company_id;
        RAISE NOTICE 'Updated existing company: %', v_company_id;
    END IF;
    
    -- Also make sure all properties belong to this company
    UPDATE properties 
    SET company_id = v_company_id 
    WHERE company_id IS NULL 
       OR company_id NOT IN (SELECT id FROM companies);
    RAISE NOTICE 'Fixed orphan properties';
    
    -- Also fix other tables that reference company_id
    UPDATE applications SET company_id = v_company_id WHERE company_id IS NULL;
    UPDATE invoices SET company_id = v_company_id WHERE company_id IS NULL;
    
    -- Fix activity_log
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_log') THEN
        UPDATE activity_log SET company_id = v_company_id WHERE company_id IS NULL;
    END IF;
    
    -- Fix areas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'areas') THEN
        UPDATE areas SET company_id = v_company_id WHERE company_id IS NULL;
    END IF;
    
    -- Fix buildings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'buildings') THEN
        UPDATE buildings SET company_id = v_company_id WHERE company_id IS NULL;
    END IF;
    
END $$;

-- STEP 4: Check the get_enhanced_dashboard_stats function exists
-- This is what the dashboard uses to load stats
SELECT 
    routine_name, 
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'get_enhanced_dashboard_stats';

-- STEP 5: Verify data counts
SELECT 'Properties' as table_name, count(*) as total FROM properties
UNION ALL
SELECT 'Applications', count(*) FROM applications
UNION ALL
SELECT 'Invoices', count(*) FROM invoices
UNION ALL
SELECT 'Activity Log', count(*) FROM activity_log
UNION ALL
SELECT 'Areas', count(*) FROM areas
UNION ALL
SELECT 'Buildings', count(*) FROM buildings
UNION ALL
SELECT 'Profiles (Team)', count(*) FROM profiles;

-- STEP 6: Check if properties have correct company_id
SELECT 
    p.id, 
    p.address, 
    p.company_id,
    p.status,
    p.rent,
    c.name as company_name
FROM properties p
LEFT JOIN companies c ON c.id = p.company_id
LIMIT 10;

-- STEP 7: Verify final profile state
SELECT 
    '=== FIXED PROFILE STATE ===' as section,
    p.id,
    u.email,
    p.full_name,
    p.role,
    p.company_id,
    p.is_super_admin,
    c.id as company_id_check,
    c.name as company_name,
    c.subscription_plan,
    c.subscription_status,
    c.is_lifetime_access
FROM profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN companies c ON c.id = p.company_id
WHERE u.email = 'konamak@icloud.com';
