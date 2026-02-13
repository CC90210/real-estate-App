-- FIX_INVITES_AND_STRIPE_V3.sql
-- 1. HARDENED RLS FOR TEAM INVITATIONS (Total Admin Control)
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Allow Super Admins and Company Admins to do EVERYTHING (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Admins have full control over invitations" ON public.team_invitations;
CREATE POLICY "Admins have full control over invitations"
ON public.team_invitations 
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (is_super_admin = true OR (role = 'admin' AND company_id = team_invitations.company_id))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (is_super_admin = true OR (role = 'admin' AND company_id = team_invitations.company_id))
    )
);

-- 2. ROBUST INVITATION LOOKUP (Public/Anon access via token)
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

-- 3. UNIFIED PROFILE INITIALIZATION (Admin Level)
-- This function is called by the Signup API and ensures invitations are respected.
CREATE OR REPLACE FUNCTION public.ensure_user_profile_admin(u_id uuid, u_email text, f_name text, c_name text, j_title text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
    new_company_id uuid;
    existing_profile_id uuid;
    invite_record record;
BEGIN
    -- 1. Check for existing profile
    SELECT id INTO existing_profile_id FROM public.profiles WHERE id = u_id;
    
    -- 2. Check for pending invitation
    SELECT * INTO invite_record
    FROM public.team_invitations
    WHERE email = u_email
    AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;

    IF existing_profile_id IS NOT NULL THEN
        -- Profile exists: Sync if needed
        IF invite_record.id IS NOT NULL THEN
            UPDATE public.profiles 
            SET company_id = invite_record.company_id,
                role = invite_record.role,
                full_name = COALESCE(f_name, full_name),
                job_title = COALESCE(j_title, job_title)
            WHERE id = u_id;
            
            UPDATE public.team_invitations SET status = 'accepted', accepted_at = now(), accepted_by = u_id WHERE id = invite_record.id;
        END IF;
        RETURN jsonb_build_object('status', 'success', 'message', 'Profile sync complete');
    END IF;

    -- 3. Create New Profile
    IF invite_record.id IS NOT NULL THEN
        -- JOIN EXISTING COMPANY
        INSERT INTO public.profiles (id, email, full_name, role, company_id, job_title)
        VALUES (u_id, u_email, COALESCE(f_name, 'New Member'), invite_record.role, invite_record.company_id, j_title);
        
        UPDATE public.team_invitations SET status = 'accepted', accepted_at = now(), accepted_by = u_id WHERE id = invite_record.id;
    ELSE
        -- CREATE NEW COMPANY (Standard Signup)
        INSERT INTO public.companies (name, email, trial_ends_at)
        VALUES (COALESCE(c_name, 'My Company'), u_email, now() + interval '14 days')
        RETURNING id INTO new_company_id;

        INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id)
        VALUES (u_id, u_email, COALESCE(f_name, 'Admin'), j_title, 'admin', new_company_id);
    END IF;

    RETURN jsonb_build_object('status', 'success', 'message', 'Profile created successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. ENSURE PERMISSIONS
GRANT ALL ON TABLE public.team_invitations TO service_role;
GRANT ALL ON TABLE public.team_invitations TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_invitations TO authenticated;
GRANT ALL ON TABLE public.profiles TO authenticated, service_role;

SELECT 'TEAM INVITATIONS RLS, RPC & PERMISSIONS FULLY REPAIRED' as status;
