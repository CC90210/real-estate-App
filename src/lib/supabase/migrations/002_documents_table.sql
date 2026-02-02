-- =================================================================
-- DOCUMENTS TABLE MIGRATION
-- =================================================================
-- Creates a documents table for persisting generated documents
-- with proper RLS policies for multi-tenant security.
-- =================================================================

BEGIN;

-- 1. Create documents table (if it doesn't exist or needs recreation)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('property_summary', 'lease_proposal', 'showing_sheet', 'application_summary')),
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    company_id UUID NOT NULL,
    created_by UUID REFERENCES profiles(id),
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_property_id ON documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_application_id ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- 3. Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any
DROP POLICY IF EXISTS "Company users can view documents" ON documents;
DROP POLICY IF EXISTS "Company users can insert documents" ON documents;
DROP POLICY IF EXISTS "Company users can delete documents" ON documents;

-- 5. Create secure RLS policies
CREATE POLICY "Company users can view documents"
ON documents FOR SELECT TO authenticated
USING (company_id = get_my_company());

CREATE POLICY "Company users can insert documents"
ON documents FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Creators can delete their documents"
ON documents FOR DELETE TO authenticated
USING (company_id = get_my_company() AND created_by = auth.uid());

-- 6. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_updated_at ON documents;
CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

COMMIT;

-- =================================================================
-- EXECUTION COMPLETE:
-- 1. Documents table created with proper schema
-- 2. Indexes added for performance
-- 3. RLS policies enforce company isolation
-- =================================================================
