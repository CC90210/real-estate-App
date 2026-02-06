-- FINAL INVITATIONS & ONBOARDING SETUP
-- Run this script in your Supabase SQL Editor to fix the "table not found" error
-- and enable the secure team invitation flow.

-- 1. Create the Invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'agent', 'landlord')),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamptz DEFAULT now(),
  invited_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enable Security (Row Level Security)
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "View invitations for own company" ON public.invitations;
DROP POLICY IF EXISTS "Manage invitations for own company" ON public.invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;

-- Create Policies
CREATE POLICY "View invitations for own company"
ON public.invitations
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can manage invitations"
ON public.invitations
FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. Create the Validation Function (Used by the /join page)
-- This function allows public access (SECURITY DEFINER) to validate a token without being logged in.
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
        i.id,
        i.email,
        i.role,
        i.company_id,
        c.name as company_name,
        c.logo_url as company_logo_url,
        i.status
    FROM public.invitations i
    JOIN public.companies c ON c.id = i.company_id
    WHERE i.token = token_input
    AND i.status = 'pending'
    AND i.expires_at > now();
END;
$$;

-- 4. Update the User Creation Trigger
-- This ensures that when the invited user signs up, they are automatically linked to the company.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    invite_record public.invitations%ROWTYPE;
    new_company_id uuid;
BEGIN
    -- Check for a valid Pending Invitation for this email
    SELECT * INTO invite_record
    FROM public.invitations
    WHERE email = new.email
    AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;

    IF invite_record IS NOT NULL THEN
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
        UPDATE public.invitations 
        SET status = 'accepted', updated_at = now()
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
            'admin', -- Default to admin for new accounts
            new_company_id
        );
    END IF;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    -- Fallback log in case of errors, but try not to block signup if possible
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure Trigger is Active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
