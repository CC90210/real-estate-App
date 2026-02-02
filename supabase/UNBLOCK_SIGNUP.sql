-- ==============================================================================
-- UNIVERSAL RLS FIX: UNBLOCK SIGNUP AND PROFILE CREATION
-- RUN THIS IF YOU ARE SEEING "RLS VIOLATION" ERRORS
-- ==============================================================================

-- 1. Ensure Table Structure is correct
ALTER TABLE IF EXISTS public.companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 2. RESET RLS POLICIES FOR SETUP TABLES
-- We grant basic CRUD access to authenticated users for their own setup.

-- COMPANIES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow signup inserts" ON public.companies;
CREATE POLICY "Allow signup inserts" ON public.companies 
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow signup selects" ON public.companies;
CREATE POLICY "Allow signup selects" ON public.companies 
FOR SELECT TO authenticated USING (true); -- Temporary liberal select to fix RETURNING id

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow self inserts" ON public.profiles;
CREATE POLICY "Allow self inserts" ON public.profiles 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow self selects" ON public.profiles;
CREATE POLICY "Allow self selects" ON public.profiles 
FOR SELECT TO authenticated USING (auth.uid() = id);

-- 3. FIX RPC FUNCTION PERMISSIONS
-- Ensure the function is reachable and has the right context
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO anon, authenticated, service_role;

-- 4. FORCE REFRESH SCHEMA CACHE
-- Sometimes Supabase needs a nudge to see new columns
NOTIFY pgrst, 'reload schema';

SELECT 'DATABASE PERMISSIONS REFRESHED' as status;
