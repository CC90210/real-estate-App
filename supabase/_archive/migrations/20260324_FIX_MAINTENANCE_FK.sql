-- ============================================================================
-- Fix maintenance_requests foreign keys for profile joins
-- The submitted_by and assigned_to columns exist but lack FK constraints,
-- causing PostgREST join queries to fail with "Could not find a relationship"
-- ============================================================================

-- Add FK constraint for submitted_by -> profiles(id) if not exists
DO $$ BEGIN
    ALTER TABLE public.maintenance_requests
        ADD CONSTRAINT maintenance_requests_submitted_by_fkey
        FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_column THEN
        -- Column doesn't exist, add it first
        ALTER TABLE public.maintenance_requests ADD COLUMN submitted_by UUID;
        ALTER TABLE public.maintenance_requests
            ADD CONSTRAINT maintenance_requests_submitted_by_fkey
            FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
END $$;

-- Add FK constraint for assigned_to -> profiles(id) if not exists
DO $$ BEGIN
    ALTER TABLE public.maintenance_requests
        ADD CONSTRAINT maintenance_requests_assigned_to_fkey
        FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_column THEN
        ALTER TABLE public.maintenance_requests ADD COLUMN assigned_to UUID;
        ALTER TABLE public.maintenance_requests
            ADD CONSTRAINT maintenance_requests_assigned_to_fkey
            FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'MAINTENANCE FK CONSTRAINTS ADDED' as status;
