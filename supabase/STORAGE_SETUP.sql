-- ==============================================================================
-- AUTOMATION INFRASTRUCTURE - DOCUMENT STORAGE (FIXED PERMISSIONS)
-- Sets up secure storage policies.
-- NOTE: We skip 'ALTER TABLE' as storage.objects typically has RLS enabled by default.
-- ==============================================================================

-- 1. Create a secure storage bucket for generated documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-attachments', 'document-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to prevent conflicts (and handle re-runs)
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own company documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access" ON storage.objects;

-- 3. Policy: Allow authenticated users to upload files to their own folder (company isolation)
-- We'll use a structure like: document-attachments/{company_id}/{filename}
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'document-attachments' AND
    (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid())
);

-- 4. Policy: Allow users to read documents belonging to their company
CREATE POLICY "Users can read own company documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'document-attachments' AND
    (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid())
);

-- 5. Policy: Allow automation/service role full access to everything in this bucket
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'document-attachments')
WITH CHECK (bucket_id = 'document-attachments');

SELECT 'Storage bucket [document-attachments] configured successfully (Active Policies Updated)' as status;
