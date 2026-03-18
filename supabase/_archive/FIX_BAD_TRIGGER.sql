-- ==============================================================================
-- FIX BROKEN TRIGGER ON PROPERTIES
-- The existing trigger 'log_property_changes' attempts to insert into 'description' column 
-- of 'activity_log', which does not exist. It must use 'details' (JSONB).
-- ==============================================================================

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
    -- Attempt to get user/company context
    current_user_id := auth.uid();
    
    -- Try to fetch company_id from the record itself if available, or profile
    IF (TG_OP = 'INSERT') THEN
       current_company_id := NEW.company_id;
    ELSIF (TG_OP = 'UPDATE') THEN
       current_company_id := NEW.company_id;
    END IF;

    entity_name := COALESCE(NEW.address, 'Unknown Property');
    IF NEW.unit_number IS NOT NULL THEN
        entity_name := entity_name || ' (Unit ' || NEW.unit_number || ')';
    END IF;

    -- Handle INSERT
    IF (TG_OP = 'INSERT') THEN
         -- Fix: Use details column (JSONB) instead of description
        INSERT INTO activity_log (company_id, user_id, action, entity_type, entity_id, details)
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
            )
        );
        RETURN NEW;
    END IF;

    -- Handle UPDATE
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
            INSERT INTO activity_log (company_id, user_id, action, entity_type, entity_id, details)
            VALUES (
                current_company_id,
                current_user_id,
                'updated',
                'properties',
                NEW.id,
                jsonb_build_object(
                    'description', 'Updated ' || entity_name || ': ' || changes_desc, 
                    'changes', changes_desc
                )
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$trig$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure Trigger is Attached
DROP TRIGGER IF EXISTS trigger_log_property_changes ON properties;
CREATE TRIGGER trigger_log_property_changes
    AFTER INSERT OR UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION log_property_changes();

NOTIFY pgrst, 'reload schema';
