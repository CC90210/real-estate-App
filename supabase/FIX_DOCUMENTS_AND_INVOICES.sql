-- ==============================================================================
-- FIX DOCUMENTS & INVOICES (RLS, Schema, and Permissions)
-- ==============================================================================

-- 1. DOCUMENTS TABLE
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

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_documents_company ON public.documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop old policies to ensure clean slate
DROP POLICY IF EXISTS "Company Access Documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own company documents" ON public.documents;
DROP POLICY IF EXISTS "Users can create company documents" ON public.documents;

-- Create Unified Policy
CREATE POLICY "Company Access Documents" ON public.documents
    FOR ALL
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());


-- 2. INVOICES TABLE
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
    status TEXT DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
    notes TEXT,
    pdf_url TEXT
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Company Access Invoices" ON public.invoices;

-- Create Unified Policy
CREATE POLICY "Company Access Invoices" ON public.invoices
    FOR ALL
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- 3. GRANT PERMISSIONS (Critical for making sure the API interaction works)
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

NOTIFY pgrst, 'reload schema';
