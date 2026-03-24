-- ============================================================================
-- PropFlow: Increase storage limits to 250MB for enterprise document handling
-- Date: 2026-03-24
--
-- Screening reports, lease agreements, inspection photos, and property
-- documentation can be very large. 50MB is too restrictive for enterprise use.
-- 250MB handles multi-hundred-page PDFs, high-res photo sets, and video.
-- ============================================================================

-- 250 MB = 262144000 bytes
UPDATE storage.buckets
SET file_size_limit = 262144000
WHERE id IN (
    'application-documents',
    'application-screening-reports',
    'property-photos',
    'media'
);

-- Logos stay at 10MB (no need for massive logo files)
UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'logos';

SELECT 'STORAGE LIMITS UPDATED TO 250MB' as status;
