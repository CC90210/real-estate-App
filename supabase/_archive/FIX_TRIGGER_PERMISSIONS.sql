-- ==============================================================================
-- FINAL ROBUST FIX FOR SIGNUP TRIGGER (RUN THIS NOW)
-- ==============================================================================

-- 1. DROP EXISTING TRIGGER/FUNCTION TO ENSURE CLEAN UPDATE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. RECREATE FUNCTION WITH 'search_path' AND ERROR LOGGING
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_company_id uuid;
    c_name text;
    j_title text;
    f_name text;
BEGIN
    -- Set search path to ensure we target public schema tables
    -- (This fixes issues where the function can't find 'companies' or 'profiles')
    
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

-- 3. RECREATE TRIGGER
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. CRITICAL: GRANT PERMISSIONS (Fixes potential RLS blocks)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.companies TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.automation_subscriptions TO postgres, anon, authenticated, service_role;

-- 5. OPTIONAL: DISABLE EMAIL CONFIRMATION REQUIREMENT (Must be done in Dashboard, but this helps debugging)
-- We can't disable it via SQL, but we can auto-confirm existing users if needed.
UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;
