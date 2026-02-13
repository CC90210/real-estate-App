-- MASTER_RECOVERY_V6 (TOTAL STABILITY)
-- This version fixes the "record new has no field updated_at" error and removes Landlords.

-- 1. CLEANUP OLD LOGIC
DROP FUNCTION IF EXISTS public.ensure_user_profile_admin(uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.ensure_user_profile_admin(uuid, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_invitation_by_token(text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.accept_invitation_manually(text) CASCADE;

-- 2. ENSURE COLUMNS EXIST (The likely cause of the "updated_at" error)
DO $$ 
BEGIN 
    -- Fix profiles table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='company_id') THEN
        ALTER TABLE public.profiles ADD COLUMN company_id uuid REFERENCES public.companies(id);
    END IF;

    -- Fix companies table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='updated_at') THEN
        ALTER TABLE public.companies ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- 3. THE SMART SIGNUP TRIGGER (SC SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    invite_record record;
    new_company_id uuid;
    c_name text;
    f_name text;
BEGIN
    f_name := COALESCE(new.raw_user_meta_data->>'full_name', 'New Member');
    c_name := COALESCE(new.raw_user_meta_data->>'company_name', 'My Company');

    -- Look for pending invitation
    SELECT * INTO invite_record
    FROM public.team_invitations
    WHERE email = new.email
    AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;

    IF invite_record.id IS NOT NULL THEN
        -- Link to Invited Company
        INSERT INTO public.profiles (id, email, full_name, role, company_id, updated_at)
        VALUES (new.id, new.email, f_name, invite_record.role, invite_record.company_id, now())
        ON CONFLICT (id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            role = EXCLUDED.role,
            full_name = EXCLUDED.full_name,
            updated_at = now();

        UPDATE public.team_invitations 
        SET status = 'accepted', accepted_at = now(), accepted_by = new.id
        WHERE id = invite_record.id;
    ELSE
        -- Create New Company
        INSERT INTO public.companies (name, email, trial_ends_at, updated_at)
        VALUES (c_name, new.email, now() + interval '14 days', now())
        RETURNING id INTO new_company_id;

        INSERT INTO public.profiles (id, email, full_name, role, company_id, updated_at)
        VALUES (new.id, new.email, f_name, 'admin', new_company_id, now())
        ON CONFLICT (id) DO UPDATE SET
            company_id = COALESCE(profiles.company_id, EXCLUDED.company_id),
            role = COALESCE(profiles.role, EXCLUDED.role),
            full_name = EXCLUDED.full_name,
            updated_at = now();
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-attach Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. MASTER RPC (Single Signature)
CREATE OR REPLACE FUNCTION public.ensure_user_profile_admin(u_id uuid, u_email text, f_name text, c_name text, j_title text)
RETURNS jsonb AS $$
DECLARE
    new_company_id uuid;
    invite_record record;
BEGIN
    -- Sync invitation if exists
    SELECT * INTO invite_record FROM public.team_invitations 
    WHERE email = u_email AND status = 'pending' ORDER BY created_at DESC LIMIT 1;

    IF invite_record.id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, full_name, role, company_id, job_title, updated_at)
        VALUES (u_id, u_email, COALESCE(f_name, 'Team Member'), invite_record.role, invite_record.company_id, j_title, now())
        ON CONFLICT (id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            role = EXCLUDED.role,
            full_name = EXCLUDED.full_name,
            job_title = EXCLUDED.job_title,
            updated_at = now();
            
        UPDATE public.team_invitations SET status = 'accepted', accepted_at = now(), accepted_by = u_id WHERE id = invite_record.id;
    ELSE
        -- Standard check/create
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u_id AND company_id IS NOT NULL) THEN
            INSERT INTO public.companies (name, email, trial_ends_at, updated_at)
            VALUES (COALESCE(c_name, 'My Company'), u_email, now() + interval '14 days', now())
            RETURNING id INTO new_company_id;

            INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id, updated_at)
            VALUES (u_id, u_email, COALESCE(f_name, 'Admin'), j_title, 'admin', new_company_id, now())
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

-- 5. RELIABLE INVITATION LOOKUP
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(token_input text)
RETURNS TABLE (id uuid, email text, role text, company_id uuid, company_name text, company_logo_url text, status text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY SELECT ti.id, ti.email, ti.role, ti.company_id, COALESCE(c.name, 'PropFlow Organization') as company_name, c.logo_url as company_logo_url, ti.status, ti.expires_at
    FROM public.team_invitations ti LEFT JOIN public.companies c ON c.id = ti.company_id WHERE ti.token = token_input AND ti.status = 'pending' AND ti.expires_at > now();
END; $$;

-- 6. PERMISSIONS & RLS HARDENING
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

GRANT ALL ON TABLE public.profiles TO service_role, postgres;
GRANT ALL ON TABLE public.companies TO service_role, postgres;
GRANT ALL ON TABLE public.team_invitations TO service_role, postgres;

SELECT 'DATABASE MASTER STABILITY V6 - COMPLETED' as status;
