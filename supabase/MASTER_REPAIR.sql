-- ==========================================================
-- V9 ABSOLUTE MASTER RECOVERY: THE FINAL TRIGGER PURGE
-- ==========================================================
-- This script performs a "Nuclear Cleanse" of the trigger system to resolve
-- the persistent "record new has no field updated_at" error.

-- 1. DYNAMIC NUCLEAR PURGE (Identify and Drop ALL Timestamp Triggers)
DO $$ 
DECLARE
    trig_record RECORD;
BEGIN
    FOR trig_record IN (
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND (trigger_name ILIKE '%updated_at%' OR trigger_name ILIKE '%handle_timestamp%' OR trigger_name ILIKE '%moddatetime%')
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trig_record.trigger_name) || ' ON public.' || quote_ident(trig_record.event_object_table) || ' CASCADE;';
        RAISE NOTICE 'Dropped trigger: % on table: %', trig_record.trigger_name, trig_record.event_object_table;
    END LOOP;
END $$;

-- 2. EXPLICIT TRIGGER PURGE (Hardcoded variants)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS tr_handle_new_user_before ON auth.users CASCADE;
DROP TRIGGER IF EXISTS tr_update_profiles_updated_at ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS update_updated_at ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS profile_updated_at_trigger ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS trigger_ensure_company ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS handle_updated_at ON public.team_invitations CASCADE;
DROP TRIGGER IF EXISTS update_updated_at ON public.team_invitations CASCADE;

-- 3. SCHEMA HARDENING (Ensure columns exist with defaults)
-- This fixes the root cause: triggers trying to access columns that aren't there.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'agent';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title text;

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.team_invitations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4. HYPER-SAFE TRIGGER logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_invite_record record;
    v_new_company_id uuid;
    v_full_name text;
    v_company_name text;
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Member');
    v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company');

    SELECT * INTO v_invite_record FROM public.team_invitations
    WHERE LOWER(email) = LOWER(NEW.email) AND status = 'pending'
    ORDER BY created_at DESC LIMIT 1;

    IF v_invite_record.id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, full_name, role, company_id)
        VALUES (NEW.id, NEW.email, v_full_name, v_invite_record.role, v_invite_record.company_id)
        ON CONFLICT (id) DO UPDATE SET company_id = EXCLUDED.company_id, role = EXCLUDED.role, full_name = EXCLUDED.full_name;

        UPDATE public.team_invitations SET status = 'accepted', accepted_at = now(), accepted_by = NEW.id WHERE id = v_invite_record.id;
    ELSE
        INSERT INTO public.companies (name, email)
        VALUES (v_company_name, NEW.email)
        RETURNING id INTO v_new_company_id;

        INSERT INTO public.profiles (id, email, full_name, role, company_id)
        VALUES (NEW.id, NEW.email, v_full_name, 'admin', v_new_company_id)
        ON CONFLICT (id) DO UPDATE SET company_id = COALESCE(profiles.company_id, EXCLUDED.company_id), role = COALESCE(profiles.role, EXCLUDED.role), full_name = EXCLUDED.full_name;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. HYPER-SAFE RPC (Admin Level)
-- Used by the Signup API to ensure consistency
CREATE OR REPLACE FUNCTION public.ensure_user_profile_admin(u_id uuid, u_email text, f_name text, c_name text, j_title text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
    v_new_company_id uuid;
    v_existing_profile_id uuid;
BEGIN
    SELECT id INTO v_existing_profile_id FROM public.profiles WHERE id = u_id;
    
    IF v_existing_profile_id IS NOT NULL THEN
        RETURN jsonb_build_object('status', 'success', 'message', 'Profile already exists');
    END IF;

    -- Create Company if not invited (Simplified for RPC)
    INSERT INTO public.companies (name, email)
    VALUES (COALESCE(c_name, 'My Company'), u_email)
    RETURNING id INTO v_new_company_id;

    -- Create Profile
    INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id)
    VALUES (u_id, u_email, COALESCE(f_name, 'New User'), j_title, 'admin', v_new_company_id);

    RETURN jsonb_build_object('status', 'success', 'message', 'Profile created successfully via RPC');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. ATTACH TRIGGER
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. GRANT PERMISSIONS
GRANT ALL ON TABLE public.profiles TO postgres, service_role, authenticated;
GRANT ALL ON TABLE public.companies TO postgres, service_role, authenticated;
GRANT ALL ON TABLE public.team_invitations TO postgres, service_role, authenticated;
GRANT USAGE ON SCHEMA public TO postgres, service_role, authenticated;

SELECT 'DATABASE MASTER RECOVERY V9 - ABSOLUTE SYNC COMPLETED' as status;
