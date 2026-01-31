-- Add available_count column to areas if it doesn't exist
ALTER TABLE areas ADD COLUMN IF NOT EXISTS available_count INTEGER DEFAULT 0;

-- Function to Recalculate Area Counts
CREATE OR REPLACE FUNCTION update_area_available_count()
RETURNS TRIGGER AS $$
DECLARE
    target_building_id UUID;
    target_area_id UUID;
BEGIN
    -- Determine the building_id involved (NEW for Insert/Update, OLD for Delete)
    IF (TG_OP = 'DELETE') THEN
        target_building_id := OLD.building_id;
    ELSE
        target_building_id := NEW.building_id;
    END IF;

    -- Find the Area ID associated with this building
    SELECT area_id INTO target_area_id
    FROM buildings
    WHERE id = target_building_id;

    -- If no area is found (should ensure data integrity elsewhere), exit
    IF target_area_id IS NOT NULL THEN
        -- Calculate the math: Count ONLY 'available' properties in this area
        WITH area_stats AS (
            SELECT count(*) as count
            FROM properties p
            JOIN buildings b ON p.building_id = b.id
            WHERE b.area_id = target_area_id
            AND p.status = 'available'
        )
        UPDATE areas
        SET available_count = (SELECT count FROM area_stats)
        WHERE id = target_area_id;
    END IF;

    RETURN NULL; -- Triggers fired AFTER (or even BEFORE) don't typically need to return the row for AFTER triggers
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists to avoid duplication errors
DROP TRIGGER IF EXISTS trigger_update_area_counts ON properties;

-- Create the Trigger
CREATE TRIGGER trigger_update_area_counts
AFTER INSERT OR UPDATE OR DELETE ON properties
FOR EACH ROW
EXECUTE FUNCTION update_area_available_count();

-- Initial Backfill: Fix all current counts
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM areas LOOP
        UPDATE areas
        SET available_count = (
            SELECT count(*)
            FROM properties p
            JOIN buildings b ON p.building_id = b.id
            WHERE b.area_id = r.id
            AND p.status = 'available'
        )
        WHERE id = r.id;
    END LOOP;
END;
$$;
