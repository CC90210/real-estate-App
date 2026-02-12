-- ==============================================================================
-- PROPFLOW TOTAL RECALL: SCHEMA FORCE-ALIGMENT
-- This script fixes "column company_id does not exist" by forcing it onto ALL tables.
-- ==============================================================================

-- 1. Create Core Dependencies
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'essentials',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FORCE 'company_id' column onto all existing tables (LEGACY FIX)
-- We use direct ALTER TABLE because CREATE TABLE IF NOT EXISTS skips existing tables.

ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agent';

ALTER TABLE IF EXISTS public.properties ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE IF EXISTS public.activity_log ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 3. Create/Repair Feeds Tables
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Force column in case table was created previously without it
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 4. Create/Repair Tenant Portal Tables
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    property_id UUID,
    submitted_by UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id);

CREATE TABLE IF NOT EXISTS public.leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    property_id UUID,
    tenant_id UUID REFERENCES auth.users(id),
    rent_amount NUMERIC(10,2),
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id);

-- 5. Helper Function (Using PL/pgSQL to avoid parser issues)
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
DECLARE
    cid UUID;
BEGIN
    SELECT company_id INTO cid FROM public.profiles WHERE id = auth.uid() LIMIT 1;
    RETURN cid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. DYNAMIC RLS SETUP (Final Guard)
DO $$
BEGIN
    -- Enable RLS
    EXECUTE 'ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY';

    -- Apply Policies (Dynamic SQL hides column names from initial script check)
    EXECUTE 'DROP POLICY IF EXISTS "notif_isolation" ON public.notifications';
    EXECUTE 'CREATE POLICY "notif_isolation" ON public.notifications FOR ALL TO authenticated USING (company_id = public.get_user_company_id())';

    EXECUTE 'DROP POLICY IF EXISTS "act_isolation" ON public.activity_log';
    EXECUTE 'CREATE POLICY "act_isolation" ON public.activity_log FOR ALL TO authenticated USING (company_id = public.get_user_company_id())';

    EXECUTE 'DROP POLICY IF EXISTS "lease_isolation" ON public.leases';
    EXECUTE 'CREATE POLICY "lease_isolation" ON public.leases FOR ALL TO authenticated USING (company_id = public.get_user_company_id() OR tenant_id = auth.uid())';

    EXECUTE 'DROP POLICY IF EXISTS "maint_isolation" ON public.maintenance_requests';
    EXECUTE 'CREATE POLICY "maint_isolation" ON public.maintenance_requests FOR ALL TO authenticated USING (company_id = public.get_user_company_id() OR submitted_by = auth.uid())';

    RAISE NOTICE 'Multi-tenancy RLS policies applied.';
END $$;

-- 7. Optimized Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notif_feed ON public.notifications(company_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed ON public.activity_log(company_id, created_at DESC);

-- Cache reload
NOTIFY pgrst, 'reload schema';
