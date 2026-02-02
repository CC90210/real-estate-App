-- ==============================================================================
-- FINAL FIX SCRIPT: RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR
-- ==============================================================================

-- PART 1: ENSURE DATABASE SCHEMA IS CORRECT
-- ------------------------------------------------------------------------------
-- Fix 'companies' table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active';

-- Fix 'profiles' table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- Ensure 'automation_subscriptions' table exists
CREATE TABLE IF NOT EXISTS automation_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    is_active boolean DEFAULT false,
    tier text DEFAULT 'none',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Grant permissions needed for the trigger to work
GRANT ALL ON companies TO service_role;
GRANT ALL ON profiles TO service_role;
GRANT ALL ON automation_subscriptions TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- PART 2: CREATE THE AUTOMATION TRIGGER
-- ------------------------------------------------------------------------------
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

    -- Default fallback
    IF c_name IS NULL THEN c_name := 'My Company'; END IF;

    -- 1. Create the Company
    INSERT INTO public.companies (name, email, trial_ends_at)
    VALUES (c_name, new.email, now() + interval '14 days')
    RETURNING id INTO new_company_id;

    -- 2. Create the Profile linked to User and Company
    INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id)
    VALUES (new.id, new.email, f_name, j_title, 'admin', new_company_id);

    -- 3. Create default subscription
    INSERT INTO public.automation_subscriptions (company_id, is_active, tier)
    VALUES (new_company_id, false, 'none');

    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but allow auth user creation to proceed (prevents total lockout)
        RAISE NOTICE 'Trigger Error: %', SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PART 3: ACTIVATE THE TRIGGER
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- CONFIRMATION
SELECT 'FIX COMPLETED SUCCESSFULLY' as status;
