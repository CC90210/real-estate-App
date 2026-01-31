-- 1. SCHEMA UPDATES (Automation & Multi-Tenancy)
-- Ensure company_id exists and adds automation_webhook_id
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_id uuid DEFAULT uuid_generate_v4(),
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
  
  -- If you had a separate 'companies' table, you would insert there too. 
  -- For now, we assume implicit company generation via ID.

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. IMMEDIATE FIX FOR 'ConaMac' (and any other stranded users)
-- This script finds users in auth.users who do NOT have a profile and creates one.
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT * FROM auth.users 
    WHERE id NOT IN (SELECT id FROM public.profiles)
  LOOP
    INSERT INTO public.profiles (id, email, full_name, role, company_id, automation_webhook_id)
    VALUES (
        user_record.id, 
        user_record.email, 
        COALESCE(user_record.raw_user_meta_data->>'full_name', 'Unknown Agent'), 
        'agent', 
        uuid_generate_v4(), 
        uuid_generate_v4()
    );
  END LOOP;
END;
$$;
