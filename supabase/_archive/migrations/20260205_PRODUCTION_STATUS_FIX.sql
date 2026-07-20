-- ==============================================================================
-- PRODUCTION FIX: ALIGN APPLICATION STATUSES
-- Issue: DB constraint uses 'rejected' while FE uses 'denied'.
-- Remediation: Expand the constraint to support both and all workflow stages.
-- ==============================================================================

DO $$ 
BEGIN
    -- Drop existing check constraint
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_status_check') THEN
        ALTER TABLE public.applications DROP CONSTRAINT applications_status_check;
    END IF;
END $$;

-- Apply production-grade comprehensive constraint
ALTER TABLE public.applications 
ADD CONSTRAINT applications_status_check 
CHECK (status IN (
    'new', 
    'submitted',
    'pending', 
    'screening', 
    'reviewing',
    'pending_landlord',
    'approved', 
    'denied',
    'rejected', 
    'withdrawn',
    'archived',
    'cancelled'
));

-- Ensure default is sensible
ALTER TABLE public.applications ALTER COLUMN status SET DEFAULT 'new';

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
