-- ==============================================================================
-- RBAC INVITATION SYSTEM SCHEMA & LOGIC
-- ==============================================================================

-- 1. Create Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'agent', 'landlord')),
  company_id uuid REFERENCES public.companies(id) NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  invited_by uuid REFERENCES public.profiles(id),
  UNIQUE(email, company_id) -- Prevent duplicate pending invites
);

-- 2. Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Admins can view/insert/delete invitations for their company
CREATE POLICY "Admins can manage invitations"
ON public.invitations
FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Secure Function to get invitation by token (Publicly accessible via RPC)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(token_input text)
RETURNS TABLE (
    id uuid,
    email text,
    role text,
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
        c.name as company_name,
        c.logo_url as company_logo_url,
        i.status
    FROM public.invitations i
    JOIN public.companies c ON i.company_id = c.id
    WHERE i.token = token_input
    AND i.expires_at > now()
    AND i.status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated, service_role;

-- 4. Update the User Creation Trigger to handle Invitations

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    invite_record record;
    new_company_id uuid;
    c_name text;
    j_title text;
    f_name text;
BEGIN
    -- Check for valid pending invitation
    SELECT i.*, c.name as company_name 
    INTO invite_record 
    FROM public.invitations i
    JOIN public.companies c ON i.company_id = c.id
    WHERE i.email = new.email 
    AND i.status = 'pending'
    ORDER BY i.created_at DESC 
    LIMIT 1;

    -- CASE 1: User joined via Invitation
    IF invite_record.id IS NOT NULL THEN
        RAISE NOTICE 'Joining existing company via invitation: %', invite_record.company_id;

        INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id)
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'full_name', 'New Team Member'),
            COALESCE(new.raw_user_meta_data->>'job_title', 'Agent'),
            invite_record.role,
            invite_record.company_id
        );

        -- Mark invitation as accepted
        UPDATE public.invitations 
        SET status = 'accepted', updated_at = now() 
        WHERE id = invite_record.id;
        
        RETURN new;
    END IF;

    -- CASE 2: New Company Sign Up (Fallback to original logic)
    c_name := new.raw_user_meta_data->>'company_name';
    j_title := new.raw_user_meta_data->>'job_title';
    f_name := new.raw_user_meta_data->>'full_name';

    IF c_name IS NULL THEN
        c_name := 'My Company';
    END IF;

    INSERT INTO public.companies (name, email, trial_ends_at)
    VALUES (c_name, new.email, now() + interval '14 days')
    RETURNING id INTO new_company_id;

    INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id)
    VALUES (
        new.id,
        new.email,
        f_name,
        j_title,
        'admin', -- Creator is admin
        new_company_id
    );

    INSERT INTO public.automation_subscriptions (company_id, is_active, tier)
    VALUES (new_company_id, false, 'none');

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind trigger (redundant if already bound, but safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. Additional Helper: Get Team Members
-- (This can be done via standard RLS on profiles, ensuring RLS exists)
-- Ensure 'admin' can view all profiles in their company
CREATE POLICY "Admins can view team members"
ON public.profiles
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
