-- ========================================================
-- AUTH & SESSION REPAIR SCRIPT
-- ========================================================
-- Run this in your Supabase SQL Editor to resolve profile 
-- and RLS issues that can cause loading hangs.

-- 1. FIX PROFILE FOR MAIN USER
UPDATE profiles
SET 
  is_super_admin = true,
  role = 'admin',
  full_name = COALESCE(full_name, 'Admin User')
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'konamak@icloud.com'
);

-- 2. ENSURE RLS POLICIES ARE RECURSION-FREE
-- Sometimes "profile" policies check "is_super_admin" which checks the profile table again.
-- This can cause a 500 hang. Let's ensure a safe policy for profiles.

-- Drop old conflicting policies if they exist (adjust names if needed)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create highly efficient, non-recursive policies
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Use a service role or a specific non-recursive check for admin viewing
-- Note: Checking 'is_super_admin' on the SAME table in the policy is what causes the hang.
CREATE POLICY "Profiles are viewable by authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- 3. ENSURE COMPANY LINKAGE
DO $$
DECLARE
    target_user_id UUID;
    target_company_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'konamak@icloud.com';
    
    IF target_user_id IS NOT NULL THEN
        -- Get or create company
        SELECT company_id INTO target_company_id FROM profiles WHERE id = target_user_id;
        
        IF target_company_id IS NULL THEN
            INSERT INTO companies (name, subscription_plan, subscription_status, is_lifetime_access)
            VALUES ('PropFlow Main', 'enterprise', 'active', true)
            RETURNING id INTO target_company_id;
            
            UPDATE profiles SET company_id = target_company_id WHERE id = target_user_id;
        ELSE
            UPDATE companies 
            SET subscription_plan = 'enterprise', is_lifetime_access = true 
            WHERE id = target_company_id;
        END IF;
    END IF;
END $$;
