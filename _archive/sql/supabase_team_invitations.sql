-- ============================================
-- TEAM INVITATIONS TABLE
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create the team_invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'landlord')),
    token uuid DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    invited_by uuid REFERENCES auth.users(id),
    accepted_by uuid REFERENCES auth.users(id),
    accepted_at timestamp with time zone,
    expires_at timestamp with time zone DEFAULT (now() + interval '7 days') NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_company ON public.team_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON public.team_invitations(status);

-- 3. Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Admins can view invitations for their company
DROP POLICY IF EXISTS "Company admins can view invitations" ON public.team_invitations;
CREATE POLICY "Company admins can view invitations" ON public.team_invitations
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Admins can insert invitations for their company
DROP POLICY IF EXISTS "Company admins can create invitations" ON public.team_invitations;
CREATE POLICY "Company admins can create invitations" ON public.team_invitations
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update (revoke) invitations for their company
DROP POLICY IF EXISTS "Company admins can update invitations" ON public.team_invitations;
CREATE POLICY "Company admins can update invitations" ON public.team_invitations
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow the service role (API routes) to bypass RLS
-- (This happens automatically with the service role key)

-- 5. Prevent duplicate pending invitations for same email + company
-- Using a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitation
    ON public.team_invitations (company_id, email)
    WHERE status = 'pending';

-- 6. Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS team_invitations_updated_at ON public.team_invitations;
CREATE TRIGGER team_invitations_updated_at
    BEFORE UPDATE ON public.team_invitations
    FOR EACH ROW EXECUTE FUNCTION update_team_invitations_updated_at();

-- 7. Update the handle_new_user trigger to handle company_id from invitations
-- This ensures the profile gets the correct company_id when created via invite
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id uuid;
BEGIN
    -- Check if user was invited to a company
    v_company_id := (new.raw_user_meta_data->>'invited_to_company')::uuid;

    INSERT INTO public.profiles (id, email, full_name, role, company_id)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        COALESCE(new.raw_user_meta_data->>'role', 'agent'),
        v_company_id
    )
    ON CONFLICT (id) DO UPDATE SET
        company_id = COALESCE(EXCLUDED.company_id, profiles.company_id),
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        updated_at = now();

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
