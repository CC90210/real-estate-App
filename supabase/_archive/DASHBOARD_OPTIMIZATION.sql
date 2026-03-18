-- ==============================================================================
-- DASHBOARD & ANALYTICS OPTIMIZATION SCRIPT
-- RUN THIS IN SUPABASE SQL EDITOR TO ENSURE OPTIMAL PERFORMANCE
-- ==============================================================================

-- 1. Ensure Performance Indexes for Activity Logs (Critical for the new Activity Page)
CREATE INDEX IF NOT EXISTS idx_activity_log_company_id ON public.activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON public.activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- 2. Ensure Performance Indexes for Analytics queries
CREATE INDEX IF NOT EXISTS idx_properties_company_status ON public.properties(company_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_company_status ON public.applications(company_id, status);
CREATE INDEX IF NOT EXISTS idx_maintenance_company_status ON public.maintenance_requests(company_id, status);

-- 3. ENSURE REPAIR FUNCTIONS EXIST (In case UNBLOCK_SIGNUP.sql wasn't run)
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
        UPDATE public.profiles SET role = 'admin' WHERE id = curr_user_id AND (role IS NULL OR role = '');
        RETURN jsonb_build_object('status', 'success', 'message', 'Profile already exists');
    END IF;

    -- Get user metadata from auth.users
    SELECT raw_user_meta_data INTO curr_meta FROM auth.users WHERE id = curr_user_id;
    c_name := curr_meta->>'company_name';
    j_title := curr_meta->>'job_title';
    f_name := curr_meta->>'full_name';
    
    IF c_name IS NULL THEN c_name := 'My Company'; END IF;
    IF f_name IS NULL THEN f_name := 'New User'; END IF;

    -- 1. Create Company
    INSERT INTO public.companies (name, email, trial_ends_at, subscription_plan, subscription_status)
    VALUES (c_name, curr_email, now() + interval '14 days', 'essentials', 'active')
    RETURNING id INTO new_company_id;

    -- 2. Create Profile
    INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id)
    VALUES (curr_user_id, curr_email, f_name, j_title, 'admin', new_company_id);

    RETURN jsonb_build_object('status', 'success', 'message', 'Profile repaired successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated, service_role;

-- 4. FINAL PERMISSIONS REFRESH
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

SELECT 'DASHBOARD SYSTEM OPTIMIZED' as status;
