-- ==========================================
-- PROPFLOW PRODUCTION READINESS UPGRADE
-- ==========================================
-- This script upgrades the database ensuring:
-- 1. Referential Integrity (Cascading Deletes)
-- 2. Automatic Cleanup (Logs deleted automatically)
-- 3. Security (Explicit RLS Policies)
-- 4. Data Consistency (Auto-updating dashboard numbers)

BEGIN; -- Start Transaction

-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- Ensures no table is left unprotected or implicitly blocking
ALTER TABLE IF EXISTS areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landlords ENABLE ROW LEVEL SECURITY;

-- 2. CREATE UNIVERSAL "AGENT ACCESS" POLICIES
-- Dropping existing policies to prevent conflicts and implementing a clean slate
DROP POLICY IF EXISTS "Access for authenticated users" ON areas;
DROP POLICY IF EXISTS "Access for authenticated users" ON buildings;
DROP POLICY IF EXISTS "Access for authenticated users" ON properties;
DROP POLICY IF EXISTS "Access for authenticated users" ON applications;
DROP POLICY IF EXISTS "Access for authenticated users" ON activity_log;

-- Policy: Allow Full Access to Authenticated Users (Agents)
-- In a real SaaS, filtering by 'organization_id' would happen here. 
-- For this single-account setup, 'authenticated' is sufficient.

CREATE POLICY "Agent Full Access - Areas" ON areas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Agent Full Access - Buildings" ON buildings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Agent Full Access - Properties" ON properties FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Agent Full Access - Applications" ON applications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Agent Full Access - Activity" ON activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Agent Full Access - Landlords" ON landlords FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. IMPLEMENT DATABASE-LEVEL CASCADING DELETES
-- This ensures if a Parent is deleted, all Children die automatically.
-- No more "zombie" records blocking deletion.

-- Fix: Properties -> Applications (If Property deleted, delete Applications)
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_property_id_fkey;
ALTER TABLE applications 
    ADD CONSTRAINT applications_property_id_fkey 
    FOREIGN KEY (property_id) 
    REFERENCES properties(id) 
    ON DELETE CASCADE;

-- Fix: Buildings -> Properties (If Building deleted, delete Units)
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_building_id_fkey;
ALTER TABLE properties 
    ADD CONSTRAINT properties_building_id_fkey 
    FOREIGN KEY (building_id) 
    REFERENCES buildings(id) 
    ON DELETE CASCADE;

-- Fix: Areas -> Buildings (If Area deleted, delete Buildings)
ALTER TABLE buildings DROP CONSTRAINT IF EXISTS buildings_area_id_fkey;
ALTER TABLE buildings 
    ADD CONSTRAINT buildings_area_id_fkey 
    FOREIGN KEY (area_id) 
    REFERENCES areas(id) 
    ON DELETE CASCADE;


-- 4. POLYMORPHIC CLEANUP TRIGGERS (Activity Logs)
-- Actvity logs don't have standard foreign keys. We use triggers to clean them up.

CREATE OR REPLACE FUNCTION delete_related_activity_logs()
RETURNS TRIGGER AS $$
BEGIN
    -- When a record is deleted, remove its logs
    DELETE FROM activity_log 
    WHERE entity_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to key tables
DROP TRIGGER IF EXISTS trigger_cleanup_logs_applications ON applications;
CREATE TRIGGER trigger_cleanup_logs_applications
    BEFORE DELETE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION delete_related_activity_logs();

DROP TRIGGER IF EXISTS trigger_cleanup_logs_properties ON properties;
CREATE TRIGGER trigger_cleanup_logs_properties
    BEFORE DELETE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION delete_related_activity_logs();


-- 5. SELF-HEALING DASHBOARD METRICS (Auto-Count)
-- Ensures 'available_count' in areas table is ALWAYS correct.

-- Ensure column exists
ALTER TABLE areas ADD COLUMN IF NOT EXISTS available_count INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION update_area_available_count()
RETURNS TRIGGER AS $$
DECLARE
    target_building_id UUID;
    target_area_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_building_id := OLD.building_id;
    ELSE
        target_building_id := NEW.building_id;
    END IF;

    -- Find Area
    SELECT area_id INTO target_area_id FROM buildings WHERE id = target_building_id;

    -- Recalculate
    IF target_area_id IS NOT NULL THEN
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
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_area_counts ON properties;
CREATE TRIGGER trigger_update_area_counts
    AFTER INSERT OR UPDATE OR DELETE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_area_available_count();

-- 6. FINAL RECALCULATION
-- Backfill everything to be perfect right now.
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

COMMIT; -- End Transaction
