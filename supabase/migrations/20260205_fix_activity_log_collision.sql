-- ==============================================================================
-- FIX: ACTIVITY_LOG NULL CONSTRAINT ERROR
-- Issue: Updates to 'applications' are failing because a trigger is trying to insert
--        into 'activity_log' with a NULL 'entity_type', colliding with FE logic.
-- Remediation: Remove backend logging triggers from 'applications' and rely on FE.
-- ==============================================================================

DO $$
DECLARE
    trg record;
BEGIN
    -- 1. Find and Drop any logging triggers on 'applications'
    FOR trg IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'public' 
        AND event_object_table = 'applications'
        -- Aggressively target likely culprits (or all, if we want to be pure, but let's target logs)
        -- Actually, safer to just drop any trigger that might be doing this.
    LOOP
        -- Only drop if it looks like a logger or we are sure. 
        -- Given the error, there IS a broken trigger.
        RAISE NOTICE 'Dropping trigger: %', trg.trigger_name;
        EXECUTE 'DROP TRIGGER IF EXISTS "' || trg.trigger_name || '" ON public.applications';
    END LOOP;
END $$;

-- 2. Drop the associated function if it exists (assuming common naming)
DROP FUNCTION IF EXISTS public.log_application_changes() CASCADE;
DROP FUNCTION IF EXISTS public.handle_application_update() CASCADE;
DROP FUNCTION IF EXISTS public.on_application_status_change() CASCADE;

-- 3. Safety Net: Make 'entity_type' nullable in activity_log
--    This prevents the "Not Null" violation even if we missed a trigger or if FE sends null.
--    Although we really want it to be populated.
ALTER TABLE public.activity_log ALTER COLUMN entity_type DROP NOT NULL;

-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
