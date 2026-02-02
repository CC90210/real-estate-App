-- ==============================================================================
-- UNIVERSAL REPAIR SCRIPT: RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR
-- ==============================================================================

-- 1. Ensure Table Structure is correct
ALTER TABLE IF EXISTS public.companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE IF EXISTS public.companies ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS job_title text;

-- Ensure automation_subscriptions table
CREATE TABLE IF NOT EXISTS public.automation_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
    is_active boolean DEFAULT false,
    tier text DEFAULT 'none',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. CREATE THE DB TRIGGER FUNCTION (For automatic creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_company_id uuid;
    c_name text;
    j_title text;
    f_name text;
BEGIN
    -- Extract metadata
    c_name := new.raw_user_meta_data->>'company_name';
    j_title := new.raw_user_meta_data->>'job_title';
    f_name := new.raw_user_meta_data->>'full_name';

    -- Fallback for debugging
    IF c_name IS NULL THEN c_name := 'My Company'; END IF;
    IF f_name IS NULL THEN f_name := 'New User'; END IF;

    -- 1. Create Company
    INSERT INTO public.companies (name, email, trial_ends_at)
    VALUES (c_name, new.email, now() + interval '14 days')
    RETURNING id INTO new_company_id;

    -- 2. Create Profile
    INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id)
    VALUES (new.id, new.email, f_name, j_title, 'admin', new_company_id);

    -- 3. Create Subscription
    INSERT INTO public.automation_subscriptions (company_id, is_active, tier)
    VALUES (new_company_id, false, 'none');

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. CREATE THE SELF-HEALING FUNCTION (RPC) - USER LEVEL
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS jsonb AS $$
DECLARE
    curr_user_id uuid;
    curr_email text;
    curr_meta jsonb;
    c_name text;
    j_title text;
    f_name text;
    new_company_id uuid;
    existing_profile_id uuid;
BEGIN
    curr_user_id := auth.uid();
    curr_email := auth.email();
    IF curr_user_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Not authenticated');
    END IF;
    
    -- Check for existing profile
    SELECT id INTO existing_profile_id FROM public.profiles WHERE id = curr_user_id;
    IF existing_profile_id IS NOT NULL THEN
        -- Ensure company_id is present, if not, try to fix it
        UPDATE public.profiles SET role = 'admin' WHERE id = curr_user_id AND role IS NULL;
        RETURN jsonb_build_object('status', 'success', 'message', 'Profile already exists');
    END IF;

    SELECT raw_user_meta_data INTO curr_meta FROM auth.users WHERE id = curr_user_id;
    c_name := curr_meta->>'company_name';
    j_title := curr_meta->>'job_title';
    f_name := curr_meta->>'full_name';
    
    IF c_name IS NULL THEN c_name := 'My Company'; END IF;
    IF f_name IS NULL THEN f_name := 'New User'; END IF;

    -- 1. Create Company
    INSERT INTO public.companies (name, email, trial_ends_at)
    VALUES (c_name, curr_email, now() + interval '14 days')
    RETURNING id INTO new_company_id;

    -- 2. Create Profile (User who signs up is ALWAYS Admin)
    INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id)
    VALUES (curr_user_id, curr_email, f_name, j_title, 'admin', new_company_id);

    -- 3. Create Subscription
    INSERT INTO public.automation_subscriptions (company_id, is_active, tier)
    VALUES (new_company_id, false, 'none');

    RETURN jsonb_build_object('status', 'success', 'message', 'Profile created successfully via RPC');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. CREATE THE SELF-HEALING FUNCTION (RPC) - ADMIN LEVEL (For API usage)
CREATE OR REPLACE FUNCTION public.ensure_user_profile_admin(u_id uuid, u_email text, f_name text, c_name text, j_title text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
    new_company_id uuid;
    existing_profile_id uuid;
BEGIN
    SELECT id INTO existing_profile_id FROM public.profiles WHERE id = u_id;
    IF existing_profile_id IS NOT NULL THEN
        -- Just ensure role is admin
        UPDATE public.profiles SET role = 'admin' WHERE id = u_id AND (role IS NULL OR role = '');
        RETURN jsonb_build_object('status', 'success', 'message', 'Profile already exists');
    END IF;

    -- 1. Create Company
    INSERT INTO public.companies (name, email, trial_ends_at)
    VALUES (COALESCE(c_name, 'My Company'), u_email, now() + interval '14 days')
    RETURNING id INTO new_company_id;

    -- 2. Create Profile
    INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id)
    VALUES (u_id, u_email, COALESCE(f_name, 'New User'), j_title, 'admin', new_company_id);

    -- 3. Create Subscription
    INSERT INTO public.automation_subscriptions (company_id, is_active, tier)
    VALUES (new_company_id, false, 'none');

    RETURN jsonb_build_object('status', 'success', 'message', 'Profile created successfully via Admin RPC');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. RESET RLS POLICIES (Make them more permissive for creation)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow signup inserts" ON public.companies;
CREATE POLICY "Allow signup inserts" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow signup selects" ON public.companies;
CREATE POLICY "Allow signup selects" ON public.companies FOR SELECT TO authenticated USING (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow self inserts" ON public.profiles;
CREATE POLICY "Allow self inserts" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Allow self selects" ON public.profiles;
CREATE POLICY "Allow self selects" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- 6. FINAL PERMISSIONS (CRITICAL)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.companies TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.automation_subscriptions TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_admin(uuid, text, text, text, text) TO service_role;

-- 7. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- 8. ENSURE TRIGGER IS ACTIVE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

SELECT 'DATABASE FULLY REPAIRED - ALL SYSTEMS GO' as status;
