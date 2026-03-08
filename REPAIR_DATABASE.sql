-- ==============================================================================
-- PROPFLOW SYSTEM REPAIR: RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR
-- ==============================================================================

-- 1. Ensure Table Structure for self-healing
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'admin';

-- 2. IMPROVED ADMIN REPAIR RPC
-- This function handles the case where a profile exists but has no company_id.
-- It will create a company if needed and link it to the existing profile.
CREATE OR REPLACE FUNCTION public.ensure_user_profile_admin(
    u_id uuid, 
    u_email text, 
    f_name text, 
    c_name text, 
    j_title text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    new_company_id uuid;
    existing_profile_id uuid;
    existing_company_id uuid;
BEGIN
    -- Check if profile exists
    SELECT id, company_id INTO existing_profile_id, existing_company_id 
    FROM public.profiles 
    WHERE id = u_id;

    -- CASE 1: Profile exists and has a company_id -> We are good.
    IF existing_profile_id IS NOT NULL AND existing_company_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'status', 'success', 
            'message', 'Profile and company already exist',
            'company_id', existing_company_id
        );
    END IF;

    -- CASE 2: Profile exists but missing company_id -> Repair it.
    IF existing_profile_id IS NOT NULL AND existing_company_id IS NULL THEN
        -- Create new company
        INSERT INTO public.companies (name, email, trial_ends_at)
        VALUES (COALESCE(c_name, 'My Workspace'), u_email, now() + interval '14 days')
        RETURNING id INTO new_company_id;

        -- Link company to existing profile
        UPDATE public.profiles 
        SET company_id = new_company_id,
            full_name = COALESCE(f_name, full_name, 'User'),
            role = COALESCE(role, 'admin')
        WHERE id = u_id;

        RETURN jsonb_build_object(
            'status', 'repaired', 
            'message', 'linked missing company to existing profile',
            'company_id', new_company_id
        );
    END IF;

    -- CASE 3: Profile does not exist -> Create everything.
    IF existing_profile_id IS NULL THEN
        -- Create Company
        INSERT INTO public.companies (name, email, trial_ends_at)
        VALUES (COALESCE(c_name, 'My Workspace'), u_email, now() + interval '14 days')
        RETURNING id INTO new_company_id;

        -- Create Profile
        INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id)
        VALUES (u_id, u_email, COALESCE(f_name, 'User'), j_title, 'admin', new_company_id);

        RETURN jsonb_build_object(
            'status', 'created', 
            'message', 'created new profile and company',
            'company_id', new_company_id
        );
    END IF;

    RETURN jsonb_build_object('status', 'error', 'message', 'unknown state');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. GRANT PERMISSIONS (Essential for API to call this)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.companies TO postgres, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_admin(uuid, text, text, text, text) TO service_role;

-- 4. FIX RLS (Ensure service_role can always see and modify profiles)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
CREATE POLICY "Service role full access" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

SELECT 'REPAIR COMPLETE: ensure_user_profile_admin is now robust' as status;
