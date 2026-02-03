-- ==============================================================================
-- SETUP LOGO STORAGE BUCKET
-- Run this in your Supabase SQL Editor to enable logo uploads
-- ==============================================================================

-- Enable storage if not already enabled
-- create extension if not exists "storage" schema extensions;

-- Create the logos storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Allow authenticated users to update their logos
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos');

-- Allow public read access to logos (so they can display on documents)
CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

-- Allow users to delete their own logos
CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos');

-- ================================================
-- IMPORTANT: Run this in your Supabase Dashboard
-- Go to: Storage > Create a new bucket
-- Name: logos
-- Public bucket: Yes
-- ================================================

SELECT 'Logo storage bucket setup complete!' AS status;
