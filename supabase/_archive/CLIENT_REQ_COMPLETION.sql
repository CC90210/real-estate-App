-- ==============================================================================
-- CLIENT REQUIREMENTS COMPLETION: IMPORT, DOCS, SHOWINGS, INVOICES
-- ==============================================================================

-- 1. APPLICATION DOCUMENTS
CREATE TABLE IF NOT EXISTS public.application_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    company_id UUID NOT NULL, -- Will function due to supplementary fix
    file_name TEXT NOT NULL,
    file_type TEXT CHECK (file_type IN ('id', 'pay_stub', 'bank_statement', 'reference', 'employment', 'other')),
    file_url TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_docs_application ON application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_app_docs_company ON application_documents(company_id);

ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;

-- Re-using helper function if it exists, ensuring it's available
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP POLICY IF EXISTS "Company can view application documents" ON application_documents;
CREATE POLICY "Company can view application documents"
ON application_documents FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Company can upload application documents" ON application_documents;
CREATE POLICY "Company can upload application documents"
ON application_documents FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Company can delete application documents" ON application_documents;
CREATE POLICY "Company can delete application documents"
ON application_documents FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id());

-- 2. INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    invoice_number TEXT NOT NULL,
    
    -- Related entities
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    landlord_id UUID REFERENCES landlords(id) ON DELETE SET NULL,
    
    -- Recipient
    recipient_name TEXT NOT NULL,
    recipient_email TEXT,
    recipient_address TEXT,
    
    -- Amounts
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    
    -- Line items stored as JSON
    items JSONB NOT NULL DEFAULT '[]',
    
    -- Dates
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_date DATE,
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    
    -- Notes
    notes TEXT,
    
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company can manage invoices" ON invoices;
CREATE POLICY "Company can manage invoices"
ON invoices FOR ALL TO authenticated
USING (company_id = public.get_user_company_id());

-- 3. SHOWINGS (Inferred Schema)
CREATE TABLE IF NOT EXISTS public.showings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    agent_id UUID REFERENCES profiles(id),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL, -- Or TEXT, using TIME for better sorting
    notes TEXT,
    
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_showings_company ON showings(company_id);
CREATE INDEX IF NOT EXISTS idx_showings_date ON showings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_showings_property ON showings(property_id);

ALTER TABLE showings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company can manage showings" ON showings;
CREATE POLICY "Company can manage showings"
ON showings FOR ALL TO authenticated
USING (company_id = public.get_user_company_id());

-- 4. STORAGE BUCKET SETUP (Application Documents)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('application-documents', 'application-documents', true) -- Forced public for now to ensure getPublicUrl works as requested in code
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Authenticated users can upload app docs" ON storage.objects;
CREATE POLICY "Authenticated users can upload app docs" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'application-documents');

DROP POLICY IF EXISTS "Authenticated users can view app docs" ON storage.objects;
CREATE POLICY "Authenticated users can view app docs" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'application-documents');

NOTIFY pgrst, 'reload schema';
SELECT 'CLIENT REQUIREMENTS SCHEMA APPLIED' as status;
