-- ==============================================================================
-- CRITICAL FIX: ENSURE ALL PROFILES HAVE COMPANY_ID
-- This script finds orphaned profiles and creates companies for them
-- ==============================================================================

-- 1. Check for profiles without company_id and fix them
DO $$
DECLARE
    orphan_profile RECORD;
    new_company_id UUID;
BEGIN
    -- Loop through all profiles that are missing a company_id
    FOR orphan_profile IN 
        SELECT id, email, full_name 
        FROM profiles 
        WHERE company_id IS NULL
    LOOP
        -- Create a new company for this orphan profile
        INSERT INTO companies (name, created_at)
        VALUES (
            COALESCE(orphan_profile.full_name, 'My Company') || '''s Company',
            NOW()
        )
        RETURNING id INTO new_company_id;

        -- Link the profile to the new company
        UPDATE profiles
        SET company_id = new_company_id
        WHERE id = orphan_profile.id;

        RAISE NOTICE 'Fixed orphan profile: % -> company: %', orphan_profile.id, new_company_id;
    END LOOP;
END $$;

-- 2. Ensure the company_id column exists and has a default constraint behavior (via trigger)
-- This prevents future orphans

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS ensure_profile_has_company ON profiles;
DROP FUNCTION IF EXISTS auto_create_company_for_profile();

-- Create the auto-healing trigger function
CREATE OR REPLACE FUNCTION auto_create_company_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_company_id UUID;
BEGIN
    -- If the new profile doesn't have a company_id, create one
    IF NEW.company_id IS NULL THEN
        INSERT INTO companies (name, created_at)
        VALUES (
            COALESCE(NEW.full_name, NEW.email, 'User') || '''s Company',
            NOW()
        )
        RETURNING id INTO new_company_id;

        NEW.company_id := new_company_id;
        RAISE NOTICE 'Auto-created company % for profile %', new_company_id, NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER ensure_profile_has_company
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_company_for_profile();

-- 3. Verify the get_user_company_id function exists and works
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT company_id INTO v_company_id
    FROM profiles
    WHERE id = auth.uid();
    
    RETURN v_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO service_role;

-- 4. Verify RLS on documents and invoices is correct
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company Access Documents" ON public.documents;
CREATE POLICY "Company Access Documents" ON public.documents
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Company Access Invoices" ON public.invoices;
CREATE POLICY "Company Access Invoices" ON public.invoices
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- 5. Grant necessary permissions
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.companies TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Final verification query (run this to see status)
SELECT 
    p.id as profile_id,
    p.email,
    p.company_id,
    c.name as company_name
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id
ORDER BY p.created_at DESC
LIMIT 10;
