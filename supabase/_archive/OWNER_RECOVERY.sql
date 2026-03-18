-- ==============================================================================
-- OWNER RECOVERY SCRIPT: PROMOTE YOUR ACCOUNT TO FULL ACCESS
-- ==============================================================================
-- 1. First, ensure the columns exist in your profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_partner boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_type text;

-- 2. PROMOTE YOURSELF (Replace 'carl@example.com' with your actual email)
-- If you don't know your email or want to promote EVERYONE (not recommended for production)
-- remove the WHERE clause.
UPDATE public.profiles 
SET is_super_admin = true, 
    is_partner = true 
WHERE email = 'carl@example.com'; -- <--- CHANGE THIS TO YOUR EMAIL

-- 3. UPGRADE YOUR COMPANY TO ENTERPRISE PLAN
-- This ensures you bypass all usage limits as well
UPDATE public.companies
SET subscription_plan = 'enterprise',
    subscription_status = 'active'
WHERE id IN (
    SELECT company_id FROM public.profiles WHERE email = 'carl@example.com'
);

-- 4. VERIFY YOUR STATUS
SELECT email, is_super_admin, is_partner, role 
FROM public.profiles 
WHERE is_super_admin = true;
