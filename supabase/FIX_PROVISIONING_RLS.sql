-- ==============================================================================
-- FIX PROVISIONING RLS & DATA ISOLATION
-- ==============================================================================

-- 1. Ensure Multi-tenancy Columns Exist on Structure Tables
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS company_id UUID;

-- 2. Indexing for performance
CREATE INDEX IF NOT EXISTS idx_areas_company ON areas(company_id);
CREATE INDEX IF NOT EXISTS idx_buildings_company ON buildings(company_id);
CREATE INDEX IF NOT EXISTS idx_properties_company ON properties(company_id);

-- 3. RLS Helper (Idempotent)
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. AREAS Policies
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company Access Areas Select" ON public.areas;
CREATE POLICY "Company Access Areas Select" ON public.areas
    FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id() OR company_id IS NULL); 
    -- Allow viewing public/system areas if any (NULL), plus own company areas

DROP POLICY IF EXISTS "Company Access Areas Insert" ON public.areas;
CREATE POLICY "Company Access Areas Insert" ON public.areas
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Company Access Areas Update" ON public.areas;
CREATE POLICY "Company Access Areas Update" ON public.areas
    FOR UPDATE TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Company Access Areas Delete" ON public.areas;
CREATE POLICY "Company Access Areas Delete" ON public.areas
    FOR DELETE TO authenticated
    USING (company_id = public.get_user_company_id());


-- 5. BUILDINGS Policies
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company Access Buildings ALL" ON public.buildings;
CREATE POLICY "Company Access Buildings ALL" ON public.buildings
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id());

-- 6. PROPERTIES Policies
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company Access Properties ALL" ON public.properties;
CREATE POLICY "Company Access Properties ALL" ON public.properties
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id());

NOTIFY pgrst, 'reload schema';
