-- ==========================================================
-- V8 DEEP CLEAN: ABOLISHING THE "UPDATED_AT" GHOST
-- ==========================================================
-- Targets legacy BEFORE INSERT triggers that reference non-existent fields.

-- 1. AGGRESSIVE PURGE (Targeting BEFORE triggers specifically)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS tr_handle_new_user_before ON auth.users CASCADE;

-- Target triggers on the profiles table
DROP TRIGGER IF EXISTS tr_update_profiles_updated_at ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS ensure_profile_has_company ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS profile_updated_at_trigger ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS tr_handle_updated_at ON public.profiles CASCADE;

-- Target triggers on the companies table
DROP TRIGGER IF EXISTS tr_update_companies_updated_at ON public.companies CASCADE;
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies CASCADE;

-- Drop all variants of the triggering functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_company_for_profile() CASCADE;

-- 2. SCHEMA STABILIZATION
-- Ensure the updated_at column exists with a solid default
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'agent';

-- 3. THE HYPER-SAFE SYMBIOTIC TRIGGER (V8 REFACTOR)
-- NO explicit 'updated_at' references in the NEW record manipulation.
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

    -- Look for pending invitation (Case Insensitive Email Match)
    SELECT * INTO v_invite_record
    FROM public.team_invitations
    WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_invite_record.id IS NOT NULL THEN
        -- JOIN EXISTING COMPANY
        -- Removed all updated_at logic here - database handles via default
        INSERT INTO public.profiles (id, email, full_name, role, company_id)
        VALUES (NEW.id, NEW.email, v_full_name, v_invite_record.role, v_invite_record.company_id)
        ON CONFLICT (id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            role = EXCLUDED.role,
            full_name = EXCLUDED.full_name;

        UPDATE public.team_invitations 
        SET status = 'accepted', accepted_at = now(), accepted_by = NEW.id
        WHERE id = v_invite_record.id;
    ELSE
        -- CREATE NEW COMPANY (Standard Signup)
        INSERT INTO public.companies (name, email)
        VALUES (v_company_name, NEW.email)
        RETURNING id INTO v_new_company_id;

        INSERT INTO public.profiles (id, email, full_name, role, company_id)
        VALUES (NEW.id, NEW.email, v_full_name, 'admin', v_new_company_id)
        ON CONFLICT (id) DO UPDATE SET
            company_id = COALESCE(profiles.company_id, EXCLUDED.company_id),
            role = COALESCE(profiles.role, EXCLUDED.role),
            full_name = EXCLUDED.full_name;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-attach AFTER trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. MAINTENANCE ACCELERATION
-- Create composite index for instant lookups
CREATE INDEX IF NOT EXISTS idx_maintenance_performance 
ON public.maintenance_requests (company_id, created_at DESC);

-- 5. FINAL PERMISSIONS & CLEANUP
GRANT ALL ON TABLE public.profiles TO service_role, postgres, authenticated;
GRANT ALL ON TABLE public.companies TO service_role, postgres, authenticated;
GRANT ALL ON TABLE public.team_invitations TO service_role, postgres, authenticated;

SELECT 'DATABASE MASTER RECOVERY V8 - DEEP CLEAN COMPLETED' as status;
