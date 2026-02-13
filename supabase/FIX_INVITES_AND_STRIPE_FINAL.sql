-- FIX_INVITES_AND_STRIPE_FINAL.sql
-- 1. HARDENED RLS FOR TEAM INVITATIONS (Including Super Admin bypass)
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view company invitations" ON public.team_invitations;
CREATE POLICY "Admins can view company invitations"
ON public.team_invitations FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_super_admin = true OR (role = 'admin' AND company_id = team_invitations.company_id)))
);

DROP POLICY IF EXISTS "Admins can create invitations" ON public.team_invitations;
CREATE POLICY "Admins can create invitations"
ON public.team_invitations FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_super_admin = true OR (role = 'admin' AND company_id = team_invitations.company_id)))
);

DROP POLICY IF EXISTS "Admins can update invitations" ON public.team_invitations;
CREATE POLICY "Admins can update invitations"
ON public.team_invitations FOR UPDATE TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_super_admin = true OR (role = 'admin' AND company_id = team_invitations.company_id)))
);

DROP POLICY IF EXISTS "Admins can delete invitations" ON public.team_invitations;
CREATE POLICY "Admins can delete invitations"
ON public.team_invitations FOR DELETE TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_super_admin = true OR (role = 'admin' AND company_id = team_invitations.company_id)))
);

-- 2. FIX USER CREATION TRIGGER (Support for existing profiles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    invite_record record;
    new_company_id uuid;
BEGIN
    -- Check for a valid Pending Invitation for this email in team_invitations
    SELECT * INTO invite_record
    FROM public.team_invitations
    WHERE email = new.email
    AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;

    IF invite_record.id IS NOT NULL THEN
        -- FOUND INVITATION: Join existing company
        INSERT INTO public.profiles (id, email, full_name, role, company_id)
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'full_name', 'Team Member'),
            invite_record.role,
            invite_record.company_id
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            company_id = EXCLUDED.company_id,
            updated_at = now();

        -- Mark invitation as accepted
        UPDATE public.team_invitations 
        SET status = 'accepted', accepted_at = now(), accepted_by = new.id
        WHERE id = invite_record.id;
        
    ELSE
        -- NO INVITATION: Create new Company (Standard Signup)
        -- Only create company if one doesn't exist for this user metadata or we really need a new one
        INSERT INTO public.companies (name, email)
        VALUES (
            COALESCE(new.raw_user_meta_data->>'company_name', 'My Company'),
            new.email
        ) RETURNING id INTO new_company_id;

        INSERT INTO public.profiles (id, email, full_name, role, company_id)
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'full_name', 'Admin'),
            'admin', -- Default to admin for new direct signups
            new_company_id
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            company_id = EXCLUDED.company_id,
            updated_at = now();
    END IF;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ENSURE TABLE PERMISSIONS ARE SECURE
GRANT ALL ON TABLE public.team_invitations TO postgres;
GRANT ALL ON TABLE public.team_invitations TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.team_invitations TO authenticated;
GRANT ALL ON TABLE public.team_invitations TO anon; -- Required for get_invitation_by_token RPC if called by anon

-- 4. FIX get_invitation_by_token TO BE EVEN MORE ROBUST
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(token_input text)
RETURNS TABLE (
    id uuid,
    email text,
    role text,
    company_id uuid,
    company_name text,
    company_logo_url text,
    status text
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
        ti.status
    FROM public.team_invitations ti
    LEFT JOIN public.companies c ON c.id = ti.company_id
    WHERE ti.token = token_input
    AND ti.status = 'pending'
    AND ti.expires_at > now();
END;
$$;
