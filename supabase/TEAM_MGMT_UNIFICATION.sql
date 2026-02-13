-- TEAM MANAGEMENT & ONBOARDING UNIFICATION
-- This script unifies the invitation system to use 'team_invitations'
-- and ensures the onboarding flow is fully functional and branded.

-- 1. Ensure team_invitations table is structured correctly
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_invitations') THEN
        CREATE TABLE public.team_invitations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
            email TEXT,
            role TEXT NOT NULL CHECK (role IN ('admin', 'agent', 'landlord')),
            token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
            invited_by UUID REFERENCES public.profiles(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
            accepted_at TIMESTAMP WITH TIME ZONE,
            accepted_by UUID REFERENCES public.profiles(id)
        );
    END IF;
END $$;

-- 2. Drop the redundant 'invitations' table if it exists (migrate data if needed, but usually redundant)
-- DROP TABLE IF EXISTS public.invitations CASCADE;

-- 3. Create/Update the Branded Invitation RPC
-- This is used by the /join page to show company details without auth
DROP FUNCTION IF EXISTS public.get_invitation_by_token(text);

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
        c.name as company_name,
        c.logo_url as company_logo_url,
        ti.status
    FROM public.team_invitations ti
    JOIN public.companies c ON c.id = ti.company_id
    WHERE ti.token = token_input
    AND ti.status = 'pending'
    AND ti.expires_at > now();
END;
$$;

-- 4. Secure the trigger: handle_new_user
-- This ensures that when an invited user signs up, they are automatically linked.
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
        );

        -- Mark invitation as accepted
        UPDATE public.team_invitations 
        SET status = 'accepted', accepted_at = now(), accepted_by = new.id
        WHERE id = invite_record.id;
        
    ELSE
        -- NO INVITATION: Create new Company (Standard Signup)
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
        );
    END IF;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure Trigger is Active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Helper function for manual linkage (RPC for onboarding page if needed)
CREATE OR REPLACE FUNCTION public.accept_invitation_manually(token_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invite_id uuid;
    v_company_id uuid;
    v_role text;
BEGIN
    SELECT id, company_id, role INTO v_invite_id, v_company_id, v_role
    FROM public.team_invitations
    WHERE token = token_input AND status = 'pending' AND expires_at > now();

    IF v_invite_id IS NULL THEN
        RETURN false;
    END IF;

    -- Update user profile
    UPDATE public.profiles
    SET company_id = v_company_id, role = v_role
    WHERE id = auth.uid();

    -- Mark accepted
    UPDATE public.team_invitations
    SET status = 'accepted', accepted_at = now(), accepted_by = auth.uid()
    WHERE id = v_invite_id;

    RETURN true;
END;
$$;
