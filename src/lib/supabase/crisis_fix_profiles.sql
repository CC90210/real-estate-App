-- 1. SCHEMA UPDATES (Automation & Multi-Tenancy)
-- Ensure 'companies' table exists if not (Safety net)
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  logo_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure profiles has the necessary columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS automation_webhook_id uuid DEFAULT uuid_generate_v4() UNIQUE;

-- 2. TRIGGER REPLACEMENT (The "Onboarding Trigger")
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  default_role text;
  new_company_id uuid;
  new_automation_id uuid;
BEGIN
  -- Determine role (default to agent)
  default_role := COALESCE(new.raw_user_meta_data->>'role', 'agent');
  
  -- Generate new IDs
  new_company_id := uuid_generate_v4();
  new_automation_id := uuid_generate_v4();

  -- CRITICAL FIX: Create the Company FIRST to satisfy FK constraint
  INSERT INTO public.companies (id, name)
  VALUES (new_company_id, coalesce(new.raw_user_meta_data->>'full_name', 'My Agency') || '''s Workspace');

  -- Insert Profile
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    company_id, 
    automation_webhook_id
  )
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    default_role,
    new_company_id,
    new_automation_id
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. IMMEDIATE FIX FOR 'ConaMac' (and any other stranded users)
-- This script finds users in auth.users who do NOT have a profile and creates one AND their company.
DO $$
DECLARE
  user_record RECORD;
  new_company_id uuid;
BEGIN
  FOR user_record IN 
    SELECT * FROM auth.users 
    WHERE id NOT IN (SELECT id FROM public.profiles)
  LOOP
    new_company_id := uuid_generate_v4();
    
    -- 1. Create Company
    INSERT INTO public.companies (id, name)
    VALUES (new_company_id, COALESCE(user_record.raw_user_meta_data->>'full_name', 'Agent') || '''s Workspace')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Create Profile
    INSERT INTO public.profiles (id, email, full_name, role, company_id, automation_webhook_id)
    VALUES (
        user_record.id, 
        user_record.email, 
        COALESCE(user_record.raw_user_meta_data->>'full_name', 'Unknown Agent'), 
        'agent', 
        new_company_id, 
        uuid_generate_v4()
    );
  END LOOP;
END;
$$;
