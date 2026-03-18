-- ==============================================================================
-- URGENT REPAIR: DOCUMENTS & INVOICES
-- Uses CREATE OR REPLACE to avoid 'Drop Cascade' dependency errors
-- ==============================================================================

-- 1. Update the Helper Function (Safe Update)
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Ensures strict security context
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

-- Ensure Execution Permissions
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO service_role;

-- 2. ENSURE DOCUMENTS TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_id UUID NOT NULL, 
    created_by UUID REFERENCES auth.users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content JSONB DEFAULT '{}'::jsonb,
    pdf_url TEXT,
    property_id UUID REFERENCES properties(id),
    application_id UUID REFERENCES applications(id),
    status TEXT DEFAULT 'completed'
);

-- 3. ENSURE INVOICES TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_id UUID NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    invoice_number TEXT,
    recipient_name TEXT,
    recipient_email TEXT,
    property_id UUID REFERENCES properties(id),
    issue_date DATE,
    due_date DATE,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    pdf_url TEXT
);

-- 4. FIX RLS POLICIES (Documents)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop specifically the ones we are fixing (ignoring others to avoid cascade issues)
DROP POLICY IF EXISTS "Company Access Documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own company documents" ON public.documents;
DROP POLICY IF EXISTS "Users can create company documents" ON public.documents;

-- Create Unified Policy for Documents
CREATE POLICY "Company Access Documents" ON public.documents
    FOR ALL
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- 4. FIX RLS POLICIES (Invoices)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company Access Invoices" ON public.invoices;

-- Create Unified Policy for Invoices
CREATE POLICY "Company Access Invoices" ON public.invoices
    FOR ALL
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- 5. GRANT PERMISSIONS (Docs & Invoices)
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

NOTIFY pgrst, 'reload schema';
