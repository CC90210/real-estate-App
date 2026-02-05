-- ==============================================================================
-- HOTFIX: APPLICATIONS STATUS CONSTRAINT
-- Issue: 'applications_status_check' is violating inserts.
-- Remediation: 
-- 1. Drop the restrictive constraint.
-- 2. Re-add it with a comprehensive list of allowed statuses (lowercase).
-- ==============================================================================

-- 1. Drop existing check constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_status_check') THEN
        ALTER TABLE public.applications DROP CONSTRAINT applications_status_check;
    END IF;
    
    -- Also drop 'application_status_check' if it was named that way
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_status_check') THEN
        ALTER TABLE public.applications DROP CONSTRAINT application_status_check;
    END IF;
END $$;

-- 2. Add the correct constraint (Case Insensitive logic handled by passing lowercase from FE, but DB ensures validity)
ALTER TABLE public.applications 
ADD CONSTRAINT applications_status_check 
CHECK (status IN (
    'new', 
    'pending', 
    'reviewing', 
    'screening', 
    'approved', 
    'rejected', 
    'archived',
    'submitted' -- Adding 'submitted' as a safe alias for 'new' or 'pending' if used
));

-- 3. Ensure 'status' column exists and has a default
ALTER TABLE public.applications 
ALTER COLUMN status SET DEFAULT 'pending';

-- 4. Not related to constraint, but crucial for Multi-Unit Logic (Part of user request)
-- Add trigger or logic helper if needed? No, logic will be handled in Typescript transaction.
-- Just ensure columns are ready.

NOTIFY pgrst, 'reload schema';
