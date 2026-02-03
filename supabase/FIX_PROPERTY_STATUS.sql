-- ==============================================================================
-- FIX: Properties Status Constraint
-- The status column has a check constraint that doesn't include all values
-- ==============================================================================

-- Drop the existing constraint
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;

-- Add a new constraint with all valid statuses including 'maintenance'
ALTER TABLE public.properties ADD CONSTRAINT properties_status_check 
    CHECK (status IN ('available', 'rented', 'pending', 'maintenance', 'off_market', 'sold'));

-- Verify
SELECT 'Status constraint updated successfully!' AS status;
