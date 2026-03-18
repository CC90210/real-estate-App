-- ==============================================================================
-- FIX LANDLORDS RLS & DATA ISOLATION
-- ==============================================================================

-- 1. Ensure Multi-tenancy Columns Exist
ALTER TABLE public.landlords ADD COLUMN IF NOT EXISTS company_id UUID;

-- 2. Indexing for performance
CREATE INDEX IF NOT EXISTS idx_landlords_company ON landlords(company_id);

-- 3. LANDLORDS Policies
ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company Access Landlords ALL" ON public.landlords;
CREATE POLICY "Company Access Landlords ALL" ON public.landlords
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id());

NOTIFY pgrst, 'reload schema';
