-- MASTER_RECOVERY_V7 (THE DEFINITIVE PURGE & SYNC)
-- This version aggressively cleans up broken triggers and ensures symbiotic team linking.

-- 1. DROP ALL POTENTIAL CONFLICTS (The Purge)
-- Auth Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users CASCADE;
-- Profile Triggers
DROP TRIGGER IF EXISTS tr_update_profiles_updated_at ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS ensure_profile_has_company ON public.profiles CASCADE;
-- Company Triggers
DROP TRIGGER IF EXISTS tr_update_companies_updated_at ON public.companies CASCADE;
-- Functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_user_profile_admin(uuid, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_company_for_profile() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- 2. HARDEN SCHEMA (Direct Alterations)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'agent';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email text;

-- 3. THE HYPER-SAFE SYMBIOTIC TRIGGER
-- This function uses "NEW" (uppercase) and handles the "updated_at" error by NOT accessing it from NEW.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_invite_record record;
    v_new_company_id uuid;
    v_full_name text;
    v_company_name text;
BEGIN
    -- Extract metadata safely
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Member');
    v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company');

    -- Look for pending invitation (Case Insensitive Email Match)
    SELECT * INTO v_invite_record
    FROM public.team_invitations
    WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_invite_record.id IS NOT NULL THEN
        -- JOIN EXISTING COMPANY (Symbiotic Linking)
        INSERT INTO public.profiles (id, email, full_name, role, company_id, updated_at)
        VALUES (NEW.id, NEW.email, v_full_name, v_invite_record.role, v_invite_record.company_id, now())
        ON CONFLICT (id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            role = EXCLUDED.role,
            full_name = EXCLUDED.full_name,
            updated_at = now();

        -- Mark invitation as accepted
        UPDATE public.team_invitations 
        SET status = 'accepted', accepted_at = now(), accepted_by = NEW.id
        WHERE id = v_invite_record.id;
    ELSE
        -- CREATE NEW COMPANY (Standard Signup)
        INSERT INTO public.companies (name, email, updated_at)
        VALUES (v_company_name, NEW.email, now())
        RETURNING id INTO v_new_company_id;

        INSERT INTO public.profiles (id, email, full_name, role, company_id, updated_at)
        VALUES (NEW.id, NEW.email, v_full_name, 'admin', v_new_company_id, now())
        ON CONFLICT (id) DO UPDATE SET
            company_id = COALESCE(profiles.company_id, EXCLUDED.company_id),
            role = COALESCE(profiles.role, EXCLUDED.role),
            full_name = EXCLUDED.full_name,
            updated_at = now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-attach Trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. THE ABSOLUTE MASTER RPC (For Onboarding UI)
CREATE OR REPLACE FUNCTION public.ensure_user_profile_admin(u_id uuid, u_email text, f_name text, c_name text, j_title text)
RETURNS jsonb AS $$
DECLARE
    v_new_company_id uuid;
    v_invite_record record;
BEGIN
    -- Check for invitation first
    SELECT * INTO v_invite_record FROM public.team_invitations 
    WHERE LOWER(email) = LOWER(u_email) AND status = 'pending' ORDER BY created_at DESC LIMIT 1;

    IF v_invite_record.id IS NOT NULL THEN
        -- FORCED INVITATION SYNC
        INSERT INTO public.profiles (id, email, full_name, role, company_id, job_title, updated_at)
        VALUES (u_id, u_email, COALESCE(f_name, 'Team Member'), v_invite_record.role, v_invite_record.company_id, j_title, now())
        ON CONFLICT (id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            role = EXCLUDED.role,
            full_name = EXCLUDED.full_name,
            job_title = EXCLUDED.job_title,
            updated_at = now();
            
        UPDATE public.team_invitations SET status = 'accepted', accepted_at = now(), accepted_by = u_id WHERE id = v_invite_record.id;
    ELSE
        -- STANDARD SIGNUP CHECK
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u_id AND company_id IS NOT NULL) THEN
            INSERT INTO public.companies (name, email, updated_at)
            VALUES (COALESCE(c_name, 'My Company'), u_email, now())
            RETURNING id INTO v_new_company_id;

            INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id, updated_at)
            VALUES (u_id, u_email, COALESCE(f_name, 'Admin'), j_title, 'admin', v_new_company_id, now())
            ON CONFLICT (id) DO UPDATE SET
                company_id = EXCLUDED.company_id,
                role = EXCLUDED.role,
                updated_at = now();
        END IF;
    END IF;

    RETURN jsonb_build_object('status', 'success', 'message', 'System synchronized successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. DASHBOARD & TEAM PERMISSIONS
GRANT ALL ON TABLE public.profiles TO service_role, postgres, authenticated;
GRANT ALL ON TABLE public.companies TO service_role, postgres, authenticated;
GRANT ALL ON TABLE public.team_invitations TO service_role, postgres, authenticated;

-- Final Verification
SELECT 'MASTER RECOVERY V7 - TOTAL SYSTEM SYNC COMPLETED' as status;
