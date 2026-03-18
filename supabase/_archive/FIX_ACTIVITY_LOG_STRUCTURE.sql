-- ==============================================================================
-- FIX ACTIVITY_LOG TABLE COLUMN MISMATCH
-- The error "column details ... does not exist" means the table is missing columns.
-- We will ensure the table has all required columns.
-- ==============================================================================

-- 1. Ensure 'activity_log' table exists (if not, create it fresh)
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add Missing Columns (Safe 'IF NOT EXISTS' checks)
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS details JSONB;

-- 3. Add 'description' column primarily for backward compatibility if needed, 
--    but we prefer 'details'. Defaults to null.
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS Policy for Activity Log
DROP POLICY IF EXISTS "Company Access Activity Log" ON public.activity_log;
CREATE POLICY "Company Access Activity Log" ON public.activity_log
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id());

-- 6. Re-apply the Trigger Logic to use 'details' (Idempotent)
CREATE OR REPLACE FUNCTION log_property_changes()
RETURNS TRIGGER AS $trig$
DECLARE
    changes_desc TEXT := '';
    entity_name TEXT;
    old_status TEXT;
    new_status TEXT;
    old_rent TEXT;
    new_rent TEXT;
    current_user_id UUID;
    current_company_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF (TG_OP = 'INSERT') THEN
       current_company_id := NEW.company_id;
    ELSIF (TG_OP = 'UPDATE') THEN
       current_company_id := NEW.company_id;
    END IF;

    entity_name := COALESCE(NEW.address, 'Unknown Property');
    IF NEW.unit_number IS NOT NULL THEN
        entity_name := entity_name || ' (Unit ' || NEW.unit_number || ')';
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO activity_log (company_id, user_id, action, entity_type, entity_id, details, description)
        VALUES (
            current_company_id,
            current_user_id,
            'created', 
            'properties',
            NEW.id,
            jsonb_build_object(
                'description', 'New Unit added: ' || entity_name, 
                'address', NEW.address,
                'unit', NEW.unit_number
            ),
            'New Unit added: ' || entity_name -- Populate description too just in case
        );
        RETURN NEW;
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        old_status := COALESCE(OLD.status, 'unknown');
        new_status := COALESCE(NEW.status, 'unknown');
        old_rent := CAST(OLD.rent AS TEXT);
        new_rent := CAST(NEW.rent AS TEXT);

        IF old_status <> new_status THEN
            changes_desc := changes_desc || 'Status: ' || old_status || ' -> ' || new_status || '. ';
        END IF;

        IF OLD.rent <> NEW.rent THEN
            changes_desc := changes_desc || 'Rent: $' || old_rent || ' -> $' || new_rent || '. ';
        END IF;

        IF length(changes_desc) > 0 THEN
            INSERT INTO activity_log (company_id, user_id, action, entity_type, entity_id, details, description)
            VALUES (
                current_company_id,
                current_user_id,
                'updated',
                'properties',
                NEW.id,
                jsonb_build_object(
                    'description', 'Updated ' || entity_name || ': ' || changes_desc, 
                    'changes', changes_desc
                ),
                'Updated ' || entity_name || ': ' || changes_desc
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$trig$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Ensure Trigger is Attached
DROP TRIGGER IF EXISTS trigger_log_property_changes ON properties;
CREATE TRIGGER trigger_log_property_changes
    AFTER INSERT OR UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION log_property_changes();

NOTIFY pgrst, 'reload schema';
