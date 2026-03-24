-- ============================================================================
-- PropFlow: CATCH-UP — Apply 20260322 + 20260323 migrations that were missed
-- Run this in Supabase Dashboard > SQL Editor AFTER the MASTER migration
-- Date: 2026-03-24
-- Safe to run multiple times (all statements are idempotent).
-- ============================================================================


-- ============================================================================
-- FROM: 20260322_application_documents_expansion.sql
-- Purpose: Richer document metadata, expanded file types, storage policies
-- ============================================================================

-- Add new columns for richer document metadata
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS document_label TEXT;
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Update the CHECK constraint to include more document types
DO $$ BEGIN
    ALTER TABLE application_documents DROP CONSTRAINT IF EXISTS application_documents_file_type_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE application_documents ADD CONSTRAINT application_documents_file_type_check
    CHECK (file_type IN ('id', 'passport', 'pay_stub', 'bank_statement', 'employment', 'reference', 'screening_report', 'other'));

-- Application documents bucket — ensure exists with proper config
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'application-documents',
    'application-documents',
    true,
    52428800, -- 50 MB (upgraded from 25)
    ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Screening reports bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'application-screening-reports',
    'application-screening-reports',
    true,
    52428800, -- 50 MB
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/pdf'];

-- Storage policies for application-documents
DROP POLICY IF EXISTS "Authenticated users can upload app docs" ON storage.objects;
CREATE POLICY "Authenticated users can upload app docs" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'application-documents');

DROP POLICY IF EXISTS "Authenticated users can view app docs" ON storage.objects;
CREATE POLICY "Authenticated users can view app docs" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'application-documents');

DROP POLICY IF EXISTS "Authenticated users can delete app docs" ON storage.objects;
CREATE POLICY "Authenticated users can delete app docs" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'application-documents');

-- Storage policies for application-screening-reports
DROP POLICY IF EXISTS "Authenticated users can upload screening reports" ON storage.objects;
CREATE POLICY "Authenticated users can upload screening reports" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'application-screening-reports');

DROP POLICY IF EXISTS "Authenticated users can view screening reports" ON storage.objects;
CREATE POLICY "Authenticated users can view screening reports" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'application-screening-reports');

DROP POLICY IF EXISTS "Authenticated users can delete screening reports" ON storage.objects;
CREATE POLICY "Authenticated users can delete screening reports" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'application-screening-reports');

-- Delete policy for application_documents table (was missing)
DROP POLICY IF EXISTS "Company can delete application documents" ON application_documents;
CREATE POLICY "Company can delete application documents"
    ON application_documents FOR DELETE TO authenticated
    USING (company_id = public.get_user_company_id());

-- Add background_check_passed column if missing
ALTER TABLE applications ADD COLUMN IF NOT EXISTS background_check_passed BOOLEAN;


-- ============================================================================
-- FROM: 20260323_increase_upload_limits_and_fixes.sql
-- Purpose: Properties & social_accounts RLS fixes
-- (gmail_oauth_tokens + bucket limits already handled by MASTER migration)
-- ============================================================================

-- Properties RLS — ensure SELECT policy exists
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their company properties" ON properties;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can view their company properties"
    ON properties FOR SELECT
    USING (company_id = public.get_user_company_id());

-- Social accounts RLS
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their company social accounts" ON social_accounts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can view their company social accounts"
    ON social_accounts FOR SELECT
    USING (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can insert social accounts for their company" ON social_accounts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can insert social accounts for their company"
    ON social_accounts FOR INSERT
    WITH CHECK (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can update their company social accounts" ON social_accounts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can update their company social accounts"
    ON social_accounts FOR UPDATE
    USING (company_id = public.get_user_company_id());


-- ============================================================================
-- Property photos bucket (referenced in code but may not exist)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'property-photos',
    'property-photos',
    true,
    52428800,
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload property photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload property photos" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'property-photos');

DROP POLICY IF EXISTS "Anyone can view property photos" ON storage.objects;
CREATE POLICY "Anyone can view property photos" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'property-photos');


-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';

SELECT 'CATCH-UP MIGRATIONS APPLIED SUCCESSFULLY' as status;
-- ============================================================================
-- DONE.
-- ============================================================================
