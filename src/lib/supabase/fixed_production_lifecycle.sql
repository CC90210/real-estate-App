-- =================================================================
-- FIXED UNIT LIFECYCLE & AUDIT LOGGING
-- =================================================================
-- Uses distinct quoting ($trig$) to avoid parsing errors.
-- =================================================================

BEGIN;

-- 1. SCHEMA UPGRADE
ALTER TABLE properties ADD COLUMN IF NOT EXISTS unit_number TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lockbox_code TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deposit NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS amenities TEXT[]; 
ALTER TABLE properties ADD COLUMN IF NOT EXISTS available_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. SMART AUDIT LOGGING TRIGGER
CREATE OR REPLACE FUNCTION log_property_changes()
RETURNS TRIGGER AS $trig$
DECLARE
    changes_desc TEXT := '';
    entity_name TEXT;
    old_status TEXT;
    new_status TEXT;
    old_rent TEXT;
    new_rent TEXT;
BEGIN
    entity_name := COALESCE(NEW.address, 'Unknown Property');
    IF NEW.unit_number IS NOT NULL THEN
        entity_name := entity_name || ' (Unit ' || NEW.unit_number || ')';
    END IF;

    -- Handle INSERT
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO activity_log (action, entity_type, entity_id, description, created_at)
        VALUES ('UNIT_CREATED', 'property', NEW.id, 'New Unit added: ' || entity_name, NOW());
        RETURN NEW;
    END IF;

    -- Handle UPDATE
    IF (TG_OP = 'UPDATE') THEN
        -- Cast to text to avoid null issues in concatenation
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

        -- Check if anything meaningful changed
        IF length(changes_desc) > 0 THEN
            INSERT INTO activity_log (action, entity_type, entity_id, description, created_at)
            VALUES ('UNIT_UPDATED', 'property', NEW.id, 'Updated ' || entity_name || ': ' || changes_desc, NOW());
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$trig$ LANGUAGE plpgsql;

-- 3. ATTACH TRIGGER
DROP TRIGGER IF EXISTS trigger_log_property_changes ON properties;
CREATE TRIGGER trigger_log_property_changes
    AFTER INSERT OR UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION log_property_changes();

COMMIT;
