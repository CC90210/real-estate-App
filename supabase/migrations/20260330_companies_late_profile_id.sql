-- ============================================================================
-- PropFlow: Add late_profile_id column to companies table
-- Date: 2026-03-30
--
-- The social media connect flow reads/writes companies.late_profile_id to
-- store the Late API profile ID per company. This column was referenced in
-- code but never added via migration.
-- ============================================================================

ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS late_profile_id TEXT;

NOTIFY pgrst, 'reload schema';
