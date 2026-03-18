-- ==============================================================================
-- SELF-HEALING MECHANISM: RPC FUNCTION TO ENSURE PROFILE EXISTS
-- ==============================================================================

-- Function designed to be called from the Frontend if the Trigger fails for any reason.
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
    -- Get current authenticated user details
    curr_user_id := auth.uid();
    curr_email := auth.email();
    
    IF curr_user_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Not authenticated');
    END IF;

    -- Check if profile already exists
    SELECT id INTO existing_profile_id FROM public.profiles WHERE id = curr_user_id;
    IF existing_profile_id IS NOT NULL THEN
        RETURN jsonb_build_object('status', 'success', 'message', 'Profile already exists');
    END IF;

    -- Retrieve metadata from auth.users
    SELECT raw_user_meta_data INTO curr_meta FROM auth.users WHERE id = curr_user_id;

    -- Extract fields
    c_name := curr_meta->>'company_name';
    j_title := curr_meta->>'job_title';
    f_name := curr_meta->>'full_name';
    
    -- Fallbacks
    IF c_name IS NULL THEN c_name := 'My Company'; END IF;
    IF f_name IS NULL THEN f_name := 'New User'; END IF;

    -- 1. Create Company
    INSERT INTO public.companies (name, email, trial_ends_at)
    VALUES (c_name, curr_email, now() + interval '14 days')
    RETURNING id INTO new_company_id;

    -- 2. Create Profile
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

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;
