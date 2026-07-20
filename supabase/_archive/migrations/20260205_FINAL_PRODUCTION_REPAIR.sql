-- ==============================================================================
-- FINAL PRODUCTION REPAIR: STATUS CONSTRAINTS & CASE DOCUMENTATION
-- This script fixes the "violates check constraint" error once and for all.
-- ==============================================================================

-- 1. Ensure Case Documentation columns exist
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS additional_notes TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS denial_reason TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS reviewed_by UUID;

-- 2. DYNAMICALLY DROP ALL STATUS CONSTRAINTS
-- This handles cases where the constraint name might be different (e.g., singular vs plural)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.applications'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) ILIKE '%status%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.applications DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 3. ADD PRODUCTION-GRADE PERMISSIVE CONSTRAINT
-- This includes every possible status referenced in the frontend code.
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check 
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

-- 4. ENSURE DEFAULTS
ALTER TABLE public.applications ALTER COLUMN status SET DEFAULT 'new';

-- 5. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
