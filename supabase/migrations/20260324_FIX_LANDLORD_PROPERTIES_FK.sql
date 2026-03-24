-- ============================================================================
-- Fix landlord_properties FK to point to profiles instead of auth.users
-- The table's landlord_id references auth.users(id), but the code joins
-- via `landlord:profiles(id, full_name, email)` — PostgREST needs an FK
-- to profiles for the join to resolve.
-- ============================================================================

-- Add FK constraint from landlord_id -> profiles(id)
-- This enables PostgREST join: landlord:profiles(id, full_name, email)
DO $$ BEGIN
    ALTER TABLE public.landlord_properties
        ADD CONSTRAINT landlord_properties_landlord_id_profiles_fkey
        FOREIGN KEY (landlord_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'LANDLORD_PROPERTIES FK TO PROFILES ADDED' as status;
