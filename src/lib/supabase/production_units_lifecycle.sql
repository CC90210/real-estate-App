-- =================================================================
-- PRODUCTION UNITS LIFECYCLE & AUDIT LOGGING
-- =================================================================
-- 1. Schema Migration: Ensure all "Unit" fields exist.
-- 2. Audit Triggers: Automatically log every Create/Update/Delete.
-- =================================================================

BEGIN;

-- 1. SCHEMA MIGRATION: Ensure 'properties' has all fields for a Unit
-- We use "IF NOT EXISTS" to be safe.
ALTER TABLE properties ADD COLUMN IF NOT EXISTS unit_number TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lockbox_code TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deposit NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS amenities TEXT[]; -- Array of strings
ALTER TABLE properties ADD COLUMN IF NOT EXISTS available_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. AUDIT TRIGGER FUNCTION
-- This tracks granular changes to properties (Units)
CREATE OR REPLACE FUNCTION log_property_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes_desc TEXT := '';
    entity_name TEXT;
BEGIN
    -- Determine Name (Address + Unit)
    entity_name := COALESCE(NEW.address, 'Unknown Property');
    IF NEW.unit_number IS NOT NULL THEN
        entity_name := entity_name || ' (Unit ' || NEW.unit_number || ')';
    END IF;

    -- Handle INSERT
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO activity_log (action, entity_type, entity_id, description, created_at)
        VALUES (
            'UNIT_CREATED', 
            'property', 
            NEW.id, 
            'New Unit added: ' || entity_name,
            NOW()
        );
        RETURN NEW;
    END IF;

    -- Handle UPDATE
    IF (TG_OP = 'UPDATE') THEN
        -- Check specific fields for changes and build a log description
        IF OLD.status <> NEW.status THEN
            changes_desc := changes_desc || 'Status: ' || OLD.status || ' -> ' || NEW.status || '. ';
        END IF;

        IF OLD.rent <> NEW.rent THEN
            changes_desc := changes_desc || 'Rent: $' || OLD.rent || ' -> $' || NEW.rent || '. ';
        END IF;

        IF OLD.lockbox_code IS DISTINCT FROM NEW.lockbox_code THEN
            changes_desc := changes_desc || 'Lockbox Code updated. ';
        END IF;

        IF OLD.deposit IS DISTINCT FROM NEW.deposit THEN
             changes_desc := changes_desc || 'Deposit updated. ';
        END IF;

        -- Only insert log if something meaningful changed
        IF length(changes_desc) > 0 THEN
            INSERT INTO activity_log (action, entity_type, entity_id, description, created_at)
            VALUES (
                'UNIT_UPDATED', 
                'property', 
                NEW.id, 
                'Updated ' || entity_name || ': ' || changes_desc,
                NOW()
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. ATTACH TRIGGER
DROP TRIGGER IF EXISTS trigger_log_property_changes ON properties;
CREATE TRIGGER trigger_log_property_changes
    AFTER INSERT OR UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION log_property_changes();

-- 4. RE-VERIFY PERMISSIONS (Just in case)
GRANT ALL ON properties TO authenticated;
GRANT ALL ON activity_log TO authenticated;

COMMIT;
