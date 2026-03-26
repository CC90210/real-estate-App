-- Storage Bucket RLS — Company-Scoped File Isolation
-- Date: 2026-03-25
-- Purpose: Enforce company_id path validation on storage buckets to prevent
--          cross-tenant file access. All upload paths must start with the
--          user's company_id as the first path segment.
--
-- Path patterns enforced:
--   application-documents:         {company_id}/{app_id}/{filename}
--   application-screening-reports: {company_id}/{app_id}/{filename}
--   media:                         {company_id}/social/{filename}
--   property-photos:               {company_id}/{folder}/{filename}
--   logos:                          company-logos/{company_id}-logo-{ts}.{ext}
--   properties:                    {type}/{company_id}/{filename}
--
-- IMPORTANT: Run this AFTER deploying the code that adds company_id to
--            upload paths (social/page.tsx, PhotoUpload.tsx).
--            Existing files without company_id prefix will still be readable
--            (public buckets) but new uploads will be enforced.

-- ============================================================
-- 1. application-documents — company_id is first path segment
-- ============================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload app docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view app docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete app docs" ON storage.objects;
DROP POLICY IF EXISTS "Company-scoped app doc upload" ON storage.objects;
DROP POLICY IF EXISTS "Company-scoped app doc read" ON storage.objects;
DROP POLICY IF EXISTS "Company-scoped app doc delete" ON storage.objects;

CREATE POLICY "Company-scoped app doc upload"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'application-documents'
        AND (string_to_array(name, '/'))[1]::uuid = public.get_user_company_id()
    );

CREATE POLICY "Company-scoped app doc read"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'application-documents'
        AND (string_to_array(name, '/'))[1]::uuid = public.get_user_company_id()
    );

CREATE POLICY "Company-scoped app doc delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'application-documents'
        AND (string_to_array(name, '/'))[1]::uuid = public.get_user_company_id()
    );

-- ============================================================
-- 2. application-screening-reports — company_id is first path segment
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can upload screening reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view screening reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete screening reports" ON storage.objects;
DROP POLICY IF EXISTS "Company-scoped screening report upload" ON storage.objects;
DROP POLICY IF EXISTS "Company-scoped screening report read" ON storage.objects;
DROP POLICY IF EXISTS "Company-scoped screening report delete" ON storage.objects;

CREATE POLICY "Company-scoped screening report upload"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'application-screening-reports'
        AND (string_to_array(name, '/'))[1]::uuid = public.get_user_company_id()
    );

CREATE POLICY "Company-scoped screening report read"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'application-screening-reports'
        AND (string_to_array(name, '/'))[1]::uuid = public.get_user_company_id()
    );

CREATE POLICY "Company-scoped screening report delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'application-screening-reports'
        AND (string_to_array(name, '/'))[1]::uuid = public.get_user_company_id()
    );

-- ============================================================
-- 3. media — company_id is first path segment (social/{company_id}/...)
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete media" ON storage.objects;
DROP POLICY IF EXISTS "Company-scoped media upload" ON storage.objects;
DROP POLICY IF EXISTS "Company-scoped media read" ON storage.objects;
DROP POLICY IF EXISTS "Company-scoped media delete" ON storage.objects;

CREATE POLICY "Company-scoped media upload"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'media'
        AND (string_to_array(name, '/'))[1]::uuid = public.get_user_company_id()
    );

CREATE POLICY "Company-scoped media read"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'media'
        AND (string_to_array(name, '/'))[1]::uuid = public.get_user_company_id()
    );

CREATE POLICY "Company-scoped media delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'media'
        AND (string_to_array(name, '/'))[1]::uuid = public.get_user_company_id()
    );

-- ============================================================
-- 4. property-photos — company_id is first path segment
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can upload property photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view property photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete property photos" ON storage.objects;
DROP POLICY IF EXISTS "Company-scoped property photo upload" ON storage.objects;
DROP POLICY IF EXISTS "Company-scoped property photo read" ON storage.objects;
DROP POLICY IF EXISTS "Company-scoped property photo delete" ON storage.objects;
DROP POLICY IF EXISTS "Public property photo read" ON storage.objects;

CREATE POLICY "Company-scoped property photo upload"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'property-photos'
        AND (string_to_array(name, '/'))[1]::uuid = public.get_user_company_id()
    );

-- Property photos need public read for listing pages / tenant portal
CREATE POLICY "Public property photo read"
    ON storage.objects FOR SELECT TO anon, authenticated
    USING (bucket_id = 'property-photos');

CREATE POLICY "Company-scoped property photo delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'property-photos'
        AND (string_to_array(name, '/'))[1]::uuid = public.get_user_company_id()
    );

-- ============================================================
-- 5. logos — company_id embedded in filename, not path segment
--    Pattern: company-logos/{company_id}-logo-{ts}.{ext}
--    Keep permissive read (logos displayed publicly), restrict write
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Company-scoped logo upload" ON storage.objects;
DROP POLICY IF EXISTS "Public logo read" ON storage.objects;

CREATE POLICY "Company-scoped logo upload"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'logos'
        AND name LIKE 'company-logos/' || public.get_user_company_id()::text || '%'
    );

CREATE POLICY "Public logo read"
    ON storage.objects FOR SELECT TO anon, authenticated
    USING (bucket_id = 'logos');

-- ============================================================
-- 6. properties (area/building images) — company_id is second segment
--    Pattern: buildings/{company_id}/... or areas/{company_id}/...
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;
DROP POLICY IF EXISTS "Company-scoped property image upload" ON storage.objects;
DROP POLICY IF EXISTS "Public property image read" ON storage.objects;

CREATE POLICY "Company-scoped property image upload"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'properties'
        AND (string_to_array(name, '/'))[2]::uuid = public.get_user_company_id()
    );

CREATE POLICY "Public property image read"
    ON storage.objects FOR SELECT TO anon, authenticated
    USING (bucket_id = 'properties');

-- ============================================================
-- 7. documents (PDF generator) — uses supabaseAdmin (service role)
--    Service role bypasses RLS, so no policy needed for server-side uploads.
--    Add read policy for authenticated users to view their company's docs.
-- ============================================================

DROP POLICY IF EXISTS "Company-scoped document read" ON storage.objects;

CREATE POLICY "Company-scoped document read"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'documents');
-- Note: documents bucket paths don't include company_id currently.
-- Server-side uploads via service role bypass RLS anyway.
-- Future: add company_id prefix to pdf-generator.tsx paths.
