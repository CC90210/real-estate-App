-- =================================================================
-- EMERGENCY REPAIR SCRIPT: USER 'konamak@iCloud.com'
-- =================================================================
-- This script safely restores the profile and workspace for your specific account.
-- It respects the new foreign key constraints (Company -> Profile).

DO $$
DECLARE
  target_email text := 'konamak@iCloud.com'; -- Case insensitive check below
  target_user_id uuid;
  new_company_id uuid;
  existing_profile_id uuid;
BEGIN
  -- 1. Find the User's UUID from the Auth system
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE lower(email) = lower(target_email);
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE '❌ User % not found in Supabase Auth. Please ensure you have signed up.', target_email;
    RETURN;
  END IF;

  -- 2. Check if a profile already exists
  SELECT id INTO existing_profile_id FROM public.profiles WHERE id = target_user_id;

  IF existing_profile_id IS NOT NULL THEN
    -- Profile exists. Let's make sure it has a valid Company ID.
    RAISE NOTICE '✓ Profile exists for %. Checking integrity...', target_email;
    
    UPDATE public.profiles 
    SET 
        role = 'admin', -- Grant Admin access to ensure full visibility
        -- Create a new company if somehow this user has NULL company_id (shouldn't happen with new constraints, but good for repair)
        company_id = COALESCE(company_id, (
            WITH ins AS (
                INSERT INTO public.companies (id, name) 
                VALUES (uuid_generate_v4(), 'Restored Workspace') 
                RETURNING id
            ) SELECT id FROM ins
        ))
    WHERE id = target_user_id;
    
    RAISE NOTICE '✅ Account repaired successfully.';
    
  ELSE
    -- 3. Profile MISSING. We must create everything from scratch.
    RAISE NOTICE '⚠ Profile missing for %. Creating clean workspace...', target_email;
    
    -- A. Generate IDs
    new_company_id := uuid_generate_v4();
    
    -- B. Create Company FIRST (Vital for Foreign Key)
    INSERT INTO public.companies (id, name)
    VALUES (new_company_id, 'Konamak Real Estate');

    -- C. Create Profile SECOND
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        company_id, 
        automation_webhook_id
    )
    VALUES (
        target_user_id, 
        target_email, 
        'Konamak User', 
        'admin', -- Default to Admin
        new_company_id, 
        uuid_generate_v4()
    );

    RAISE NOTICE '✅ Account fully restored with new Workspace.';
  END IF;

END;
$$;
