-- ==============================================================================
-- SUPPLEMENTARY DATABASE FIX: EXTENDING MULTI-TENANCY TO APPLICATIONS & LOGS
-- This ensures all major entity tables are protected by the company_id filter.
-- ==============================================================================

DO $$ 
BEGIN
    -- 1. Applications Table
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='company_id') THEN
        ALTER TABLE public.applications ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    -- 2. Activity Log Table
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='activity_log' AND COLUMN_NAME='company_id') THEN
        ALTER TABLE public.activity_log ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    -- 3. Invoices/Billing (If exists)
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='invoices') THEN
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='invoices' AND COLUMN_NAME='company_id') THEN
            ALTER TABLE public.invoices ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Enable RLS for these tables
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Rebuild Policies
DROP POLICY IF EXISTS "Users can manage applications for their company" ON public.applications;
CREATE POLICY "Users can manage applications for their company" ON public.applications
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Users can view logs for their company" ON public.activity_log;
CREATE POLICY "Users can view logs for their company" ON public.activity_log
    FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Users can insert logs for their company" ON public.activity_log;
CREATE POLICY "Users can insert logs for their company" ON public.activity_log
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

NOTIFY pgrst, 'reload schema';
SELECT 'SUPPLEMENTARY TENANCY FIX APPLIED SUCCESSFULLY' as status;
