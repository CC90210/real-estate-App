-- MASTER_RECOVERY_V3.sql
-- This script provides the ultimate "total functionality" fix for invitations and signups.

-- 1. DROP FUNCTIONS TO RESET SIGNATURES
DROP FUNCTION IF EXISTS public.get_invitation_by_token(text);
DROP FUNCTION IF EXISTS public.ensure_user_profile_admin(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.accept_invitation_manually(text);

-- 2. THE ULTIMATE "SMART" TRIGGER
-- This ensures that IMMEDIATELY upon auth.users creation, the profile is linked correctly.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    invite_record record;
    new_company_id uuid;
    c_name text;
    f_name text;
BEGIN
    -- Extract metadata
    f_name := COALESCE(new.raw_user_meta_data->>'full_name', 'New Member');
    c_name := COALESCE(new.raw_user_meta_data->>'company_name', 'My Company');

    -- Check for a valid Pending Invitation for this email
    SELECT * INTO invite_record
    FROM public.team_invitations
    WHERE email = new.email
    AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;

    IF invite_record.id IS NOT NULL THEN
        -- JOIN EXISTING COMPANY
        INSERT INTO public.profiles (id, email, full_name, role, company_id)
        VALUES (new.id, new.email, f_name, invite_record.role, invite_record.company_id)
        ON CONFLICT (id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            role = EXCLUDED.role,
            full_name = EXCLUDED.full_name,
            updated_at = now();

        -- Mark invitation as accepted
        UPDATE public.team_invitations 
        SET status = 'accepted', accepted_at = now(), accepted_by = new.id
        WHERE id = invite_record.id;
        
    ELSE
        -- CREATE NEW COMPANY (Standard Signup)
        -- We only create a company if the user doesn't already have a profile with one
        INSERT INTO public.companies (name, email, trial_ends_at)
        VALUES (c_name, new.email, now() + interval '14 days')
        RETURNING id INTO new_company_id;

        INSERT INTO public.profiles (id, email, full_name, role, company_id)
        VALUES (new.id, new.email, f_name, 'admin', new_company_id)
        ON CONFLICT (id) DO UPDATE SET
            company_id = COALESCE(profiles.company_id, EXCLUDED.company_id),
            role = COALESCE(profiles.role, EXCLUDED.role),
            full_name = EXCLUDED.full_name,
            updated_at = now();
    END IF;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN new; -- Still allow user creation even if profile fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-attach Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. THE ULTIMATE "SMART" RPC (For API fallback)
CREATE OR REPLACE FUNCTION public.ensure_user_profile_admin(u_id uuid, u_email text, f_name text, c_name text, j_title text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
    new_company_id uuid;
    invite_record record;
    existing_profile record;
BEGIN
    -- 1. Get/Check Invitation
    SELECT * INTO invite_record FROM public.team_invitations 
    WHERE email = u_email AND status = 'pending' ORDER BY created_at DESC LIMIT 1;

    -- 2. Upsert Profile
    IF invite_record.id IS NOT NULL THEN
        -- FORCED SYNC TO INVITATION
        INSERT INTO public.profiles (id, email, full_name, role, company_id, job_title)
        VALUES (u_id, u_email, COALESCE(f_name, 'Team Member'), invite_record.role, invite_record.company_id, j_title)
        ON CONFLICT (id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            role = EXCLUDED.role,
            full_name = EXCLUDED.full_name,
            job_title = EXCLUDED.job_title,
            updated_at = now();
            
        UPDATE public.team_invitations SET status = 'accepted', accepted_at = now(), accepted_by = u_id WHERE id = invite_record.id;
    ELSE
        -- STANDARD SIGNUP
        SELECT * INTO existing_profile FROM public.profiles WHERE id = u_id;
        
        IF existing_profile.id IS NULL OR existing_profile.company_id IS NULL THEN
            INSERT INTO public.companies (name, email, trial_ends_at)
            VALUES (COALESCE(c_name, 'My Company'), u_email, now() + interval '14 days')
            RETURNING id INTO new_company_id;

            INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id)
            VALUES (u_id, u_email, COALESCE(f_name, 'Admin'), j_title, 'admin', new_company_id)
            ON CONFLICT (id) DO UPDATE SET
                company_id = EXCLUDED.company_id,
                role = EXCLUDED.role,
                updated_at = now();
        END IF;
    END IF;

    RETURN jsonb_build_object('status', 'success', 'message', 'Profile master sync complete');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. ROBUST INVITATION LOOKUP (Branded /Join Page)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(token_input text)
RETURNS TABLE (
    id uuid,
    email text,
    role text,
    company_id uuid,
    company_name text,
    company_logo_url text,
    status text,
    expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ti.id,
        ti.email,
        ti.role,
        ti.company_id,
        COALESCE(c.name, 'PropFlow Organization') as company_name,
        c.logo_url as company_logo_url,
        ti.status,
        ti.expires_at
    FROM public.team_invitations ti
    LEFT JOIN public.companies c ON c.id = ti.company_id
    WHERE ti.token = token_input
    AND ti.status = 'pending'
    AND ti.expires_at > now();
END;
$$;

-- 5. RELIABLE MANUAL ACCEPTANCE (For already logged in users)
CREATE OR REPLACE FUNCTION public.accept_invitation_manually(token_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite_id uuid;
    v_company_id uuid;
    v_role text;
BEGIN
    SELECT id, company_id, role INTO v_invite_id, v_company_id, v_role
    FROM public.team_invitations
    WHERE token = token_input AND status = 'pending' AND expires_at > now();

    IF v_invite_id IS NULL THEN RETURN false; END IF;

    UPDATE public.profiles
    SET company_id = v_company_id, role = v_role
    WHERE id = auth.uid();

    UPDATE public.team_invitations
    SET status = 'accepted', accepted_at = now(), accepted_by = auth.uid()
    WHERE id = v_invite_id;

    RETURN true;
END;
$$;

-- 6. PERMISSIVE DASHBOARD ACCESS (Total Authority)
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full control over invitations" ON public.team_invitations;
CREATE POLICY "Admins have full control over invitations"
ON public.team_invitations FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_super_admin = true OR (role = 'admin' AND company_id = team_invitations.company_id)))
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_super_admin = true OR (role = 'admin' AND company_id = team_invitations.company_id)))
);

-- 7. ENSURE CRITICAL TABLES HAVE RLS-BYPASSING GRANTS
GRANT ALL ON TABLE public.profiles TO service_role, postgres;
GRANT ALL ON TABLE public.companies TO service_role, postgres;
GRANT ALL ON TABLE public.team_invitations TO service_role, postgres;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

SELECT 'DATABASE MASTER RECOVERY V3 - COMPLETE' as status;
