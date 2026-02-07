-- ==============================================================================
-- AUTOMATION INFRASTRUCTURE - DOCUMENT STORAGE
-- Sets up secure storage buckets for automated document handling
-- ==============================================================================

-- 1. Create a secure storage bucket for generated documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-attachments', 'document-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow authenticated users to upload files to their own folder (company isolation)
-- We'll use a structure like: document-attachments/{company_id}/{document_id}.pdf
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

-- 5. Policy: Allow automation/service role full access
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

SELECT 'Storage bucket [document-attachments] configured successfully' as status;
