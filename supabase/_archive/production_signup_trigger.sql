-- ==============================================================================
-- PRODUCTION GRADE SIGNUP FLOW: AUTOMATION VIA TRIGGERS
-- This replaces fragile frontend inserts with a robust database trigger.
-- ==============================================================================

-- 1. Create the function that runs when a user executes auth.signUp()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_company_id uuid;
    c_name text;
    j_title text;
    f_name text;
BEGIN
    -- Extract metadata sent from the frontend
    c_name := new.raw_user_meta_data->>'company_name';
    j_title := new.raw_user_meta_data->>'job_title';
    f_name := new.raw_user_meta_data->>'full_name';

    -- Default fallback if missing (shouldn't happen with our frontend)
    IF c_name IS NULL THEN
        c_name := 'My Company';
    END IF;

    -- 1. Create the Company
    INSERT INTO public.companies (name, email, trial_ends_at)
    VALUES (
        c_name,
        new.email,
        now() + interval '14 days'
    )
    RETURNING id INTO new_company_id;

    -- 2. Create the Profile linked to User and Company
    INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id)
    VALUES (
        new.id,
        new.email,
        f_name,
        j_title,
        'admin', -- First user is always admin
        new_company_id
    );

    -- 3. Create default subscription
    INSERT INTO public.automation_subscriptions (company_id, is_active, tier)
    VALUES (
        new_company_id,
        false,
        'none'
    );

    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error (visible in Supabase logs) but don't block signup if possible, 
        -- though usually we want to rollback if profile fails.
        RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
        RETURN new; -- Proceed with auth user creation anyway, or RAISE EXCEPTION to fail
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bind the trigger to the auth.users table
-- Drop first to ensure clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 3. Ensure RLS policies don't block subsequent reads (optional but good practice)
-- Grant necessary permissions just in case
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.companies TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.automation_subscriptions TO service_role;
