-- Migration: Expand application documents table and screening report support
-- Date: 2026-03-22
-- Purpose: Support comprehensive document uploads (passport, expanded types),
--          add metadata columns, fix storage bucket policies, expand document type CHECK constraint

-- ============================================================================
-- 1. EXPAND application_documents TABLE
-- ============================================================================

-- Add new columns for richer document metadata
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS document_label TEXT;
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Update the CHECK constraint to include more document types
-- First drop the old constraint if it exists, then add expanded one
DO $$ BEGIN
    ALTER TABLE application_documents DROP CONSTRAINT IF EXISTS application_documents_file_type_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE application_documents ADD CONSTRAINT application_documents_file_type_check
    CHECK (file_type IN ('id', 'passport', 'pay_stub', 'bank_statement', 'employment', 'reference', 'screening_report', 'other'));

-- ============================================================================
-- 2. ENSURE STORAGE BUCKETS EXIST WITH PROPER POLICIES
-- ============================================================================

-- Application documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'application-documents',
    'application-documents',
    true,
    26214400, -- 25 MB
    ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Screening reports bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'application-screening-reports',
    'application-screening-reports',
    true,
    26214400, -- 25 MB
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['application/pdf'];

-- ============================================================================
-- 3. STORAGE POLICIES (idempotent - drop + create)
-- ============================================================================

-- Application documents: upload
DROP POLICY IF EXISTS "Authenticated users can upload app docs" ON storage.objects;
CREATE POLICY "Authenticated users can upload app docs" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'application-documents');

-- Application documents: view
DROP POLICY IF EXISTS "Authenticated users can view app docs" ON storage.objects;
CREATE POLICY "Authenticated users can view app docs" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'application-documents');

-- Application documents: delete
DROP POLICY IF EXISTS "Authenticated users can delete app docs" ON storage.objects;
CREATE POLICY "Authenticated users can delete app docs" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'application-documents');

-- Screening reports: upload
DROP POLICY IF EXISTS "Authenticated users can upload screening reports" ON storage.objects;
CREATE POLICY "Authenticated users can upload screening reports" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'application-screening-reports');

-- Screening reports: view
DROP POLICY IF EXISTS "Authenticated users can view screening reports" ON storage.objects;
CREATE POLICY "Authenticated users can view screening reports" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'application-screening-reports');

-- Screening reports: delete (for re-uploads)
DROP POLICY IF EXISTS "Authenticated users can delete screening reports" ON storage.objects;
CREATE POLICY "Authenticated users can delete screening reports" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'application-screening-reports');

-- ============================================================================
-- 4. DELETE POLICY for application_documents (was missing)
-- ============================================================================
DROP POLICY IF EXISTS "Company can delete application documents" ON application_documents;
CREATE POLICY "Company can delete application documents"
ON application_documents FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id());

-- ============================================================================
-- 5. ADD background_check_passed TO applications IF MISSING
-- ============================================================================
ALTER TABLE applications ADD COLUMN IF NOT EXISTS background_check_passed BOOLEAN;

NOTIFY pgrst, 'reload schema';
SELECT 'APPLICATION DOCUMENTS EXPANSION APPLIED' as status;
