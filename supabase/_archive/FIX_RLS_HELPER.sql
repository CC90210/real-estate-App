-- ==============================================================================
-- FIX AUTH HELPER & RLS (Critical for Document Generation)
-- ==============================================================================

-- 1. Helper Function: get_user_company_id
-- We drop it first to ensure we replace it with the correct SECURITY DEFINER version
DROP FUNCTION IF EXISTS public.get_user_company_id();

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of creator (postgres/admin) to bypass RLS on profiles during lookups
SET search_path = public -- Secure search path
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

-- 2. Profiles RLS (Ensure users can read their own profile to get company_id)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- 3. Documents RLS (Re-verify)
-- We need to make sure the policy actually uses the helper function correctly
DROP POLICY IF EXISTS "Company Access Documents" ON public.documents;

CREATE POLICY "Company Access Documents" ON public.documents
    FOR ALL
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- 4. Invoices RLS (Re-verify)
DROP POLICY IF EXISTS "Company Access Invoices" ON public.invoices;

CREATE POLICY "Company Access Invoices" ON public.invoices
    FOR ALL
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- 5. Properties RLS (Ensure Properties are visible for the dropdowns)
-- If this was missing, the document generator wouldn't even be able to select a property
CREATE POLICY "Company Access Properties" ON public.properties
    FOR ALL
    TO authenticated
    USING (company_id = public.get_user_company_id());

NOTIFY pgrst, 'reload schema';
