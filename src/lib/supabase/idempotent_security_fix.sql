-- =================================================================
-- IDEMPOTENT SUPER-FIX (Run this to solve "Already Exists" Errors)
-- =================================================================
-- This script safely removes the policies if they exist, then re-creates them.
-- You can run this as many times as you want without error.
-- =================================================================

BEGIN;

-- 1. Ensure RLS is verified
ALTER TABLE IF EXISTS areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

-- 2. AREAS
DROP POLICY IF EXISTS "Agent_Omnibus_Areas" ON areas;
DROP POLICY IF EXISTS "Agent Full Access - Areas" ON areas;
DROP POLICY IF EXISTS "Enable read access for all users" ON areas;
CREATE POLICY "Agent_Omnibus_Areas" ON areas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. BUILDINGS
DROP POLICY IF EXISTS "Agent_Omnibus_Buildings" ON buildings;
DROP POLICY IF EXISTS "Agent Full Access - Buildings" ON buildings;
DROP POLICY IF EXISTS "Enable read access for all users" ON buildings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON buildings;
CREATE POLICY "Agent_Omnibus_Buildings" ON buildings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. PROPERTIES
DROP POLICY IF EXISTS "Agent_Omnibus_Properties" ON properties;
DROP POLICY IF EXISTS "Agent Full Access - Properties" ON properties;
DROP POLICY IF EXISTS "Enable read access for all users" ON properties;
CREATE POLICY "Agent_Omnibus_Properties" ON properties FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. APPLICATIONS
DROP POLICY IF EXISTS "Agent_Omnibus_Applications" ON applications;
DROP POLICY IF EXISTS "Agent Full Access - Applications" ON applications;
DROP POLICY IF EXISTS "Enable read access for all users" ON applications;
CREATE POLICY "Agent_Omnibus_Applications" ON applications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. ACTIVITY LOG
DROP POLICY IF EXISTS "Agent_Omnibus_Activity" ON activity_log;
DROP POLICY IF EXISTS "Agent Full Access - Activity" ON activity_log;
DROP POLICY IF EXISTS "Enable read access for all users" ON activity_log;
CREATE POLICY "Agent_Omnibus_Activity" ON activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. LANDLORDS
DROP POLICY IF EXISTS "Agent_Omnibus_Landlords" ON landlords;
DROP POLICY IF EXISTS "Agent Full Access - Landlords" ON landlords;
DROP POLICY IF EXISTS "Enable read access for all users" ON landlords;
CREATE POLICY "Agent_Omnibus_Landlords" ON landlords FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. PROFILES
DROP POLICY IF EXISTS "Agent_Omnibus_Profiles" ON profiles;
DROP POLICY IF EXISTS "Agent Full Access - Profiles" ON profiles;
CREATE POLICY "Agent_Omnibus_Profiles" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
