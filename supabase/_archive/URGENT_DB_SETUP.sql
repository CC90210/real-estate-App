-- ==============================================================================
-- URGENT: RUN THIS SCRIPT IN SUPABASE SQL EDITOR TO FIX SIGNUP ERRORS
-- ==============================================================================

-- 1. Fix 'companies' table schema (Missing 'email' column was causing the signup error)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active';

-- 2. Ensure 'automation_subscriptions' table exists (Required for signup flow)
CREATE TABLE IF NOT EXISTS automation_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    is_active boolean DEFAULT false,
    tier text DEFAULT 'none',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Ensure 'profiles' table has necessary columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- 4. Grant necessary permissions (Fixes potential RLS/Permission errors)
GRANT ALL ON companies TO authenticated;
GRANT ALL ON companies TO service_role;
GRANT ALL ON automation_subscriptions TO authenticated;
GRANT ALL ON automation_subscriptions TO service_role;

-- 5. Create basic RLS policies to allow signup inserts
-- Allow any authenticated user to insert a company (they become the admin)
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;
CREATE POLICY "Authenticated users can create companies"
ON companies FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view their own company
DROP POLICY IF EXISTS "Users can view own company" ON companies;
CREATE POLICY "Users can view own company"
ON companies FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    )
);

-- Allow users to update their own company
DROP POLICY IF EXISTS "Admins can update own company" ON companies;
CREATE POLICY "Admins can update own company"
ON companies FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
);
