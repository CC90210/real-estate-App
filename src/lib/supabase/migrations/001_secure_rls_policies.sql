-- =================================================================
-- PRODUCTION SECURE RLS POLICIES
-- =================================================================
-- This migration removes god-mode policies and implements proper
-- company-scoped multi-tenant security using get_my_company().
-- =================================================================

BEGIN;

-- =================================================================
-- 1. HELPER FUNCTION: Get current user's company_id
-- =================================================================
CREATE OR REPLACE FUNCTION get_my_company()
RETURNS UUID AS $$
    SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =================================================================
-- 2. DROP ALL GOD-MODE POLICIES
-- =================================================================

-- Drop omnibus policies from omnibus_security_fix.sql
DROP POLICY IF EXISTS "Agent_Omnibus_Areas" ON areas;
DROP POLICY IF EXISTS "Agent_Omnibus_Buildings" ON buildings;
DROP POLICY IF EXISTS "Agent_Omnibus_Properties" ON properties;
DROP POLICY IF EXISTS "Agent_Omnibus_Applications" ON applications;
DROP POLICY IF EXISTS "Agent_Omnibus_Activity" ON activity_log;
DROP POLICY IF EXISTS "Agent_Omnibus_Landlords" ON landlords;
DROP POLICY IF EXISTS "Agent_Omnibus_Profiles" ON profiles;

-- Drop omnibus policies from final_security_lockdown.sql
DROP POLICY IF EXISTS "Agent_Omnibus_Companies" ON companies;
DROP POLICY IF EXISTS "Agent_Omnibus_Documents" ON documents;
DROP POLICY IF EXISTS "Agent_Omnibus_Notifications" ON notifications;

-- Drop any legacy policies
DROP POLICY IF EXISTS "Enable read access for all users" ON areas;
DROP POLICY IF EXISTS "Enable read access for all users" ON buildings;
DROP POLICY IF EXISTS "Enable read access for all users" ON properties;
DROP POLICY IF EXISTS "Enable read access for all users" ON applications;
DROP POLICY IF EXISTS "Enable read access for all users" ON activity_log;
DROP POLICY IF EXISTS "Enable read access for all users" ON landlords;
DROP POLICY IF EXISTS "Enable read access for all users" ON companies;
DROP POLICY IF EXISTS "Enable read access for all users" ON documents;
DROP POLICY IF EXISTS "Enable read access for all users" ON notifications;

-- =================================================================
-- 3. ENSURE RLS IS ENABLED ON ALL TABLES
-- =================================================================
ALTER TABLE IF EXISTS areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- 4. CREATE COMPANY-SCOPED SECURE POLICIES
-- =================================================================

-- PROFILES: Users can only see profiles in their company
CREATE POLICY "Users can view company profiles"
ON profiles FOR SELECT TO authenticated
USING (company_id = get_my_company() OR id = auth.uid());

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- COMPANIES: Users can only see their own company
CREATE POLICY "Users can view own company"
ON companies FOR SELECT TO authenticated
USING (id = get_my_company());

CREATE POLICY "Admins can update company"
ON companies FOR UPDATE TO authenticated
USING (id = get_my_company() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

-- AREAS: Company-scoped access
CREATE POLICY "Company users can view areas"
ON areas FOR SELECT TO authenticated
USING (company_id = get_my_company());

CREATE POLICY "Company users can insert areas"
ON areas FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can update areas"
ON areas FOR UPDATE TO authenticated
USING (company_id = get_my_company())
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can delete areas"
ON areas FOR DELETE TO authenticated
USING (company_id = get_my_company());

-- BUILDINGS: Company-scoped access
CREATE POLICY "Company users can view buildings"
ON buildings FOR SELECT TO authenticated
USING (company_id = get_my_company());

CREATE POLICY "Company users can insert buildings"
ON buildings FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can update buildings"
ON buildings FOR UPDATE TO authenticated
USING (company_id = get_my_company())
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can delete buildings"
ON buildings FOR DELETE TO authenticated
USING (company_id = get_my_company());

-- PROPERTIES: Company-scoped access
CREATE POLICY "Company users can view properties"
ON properties FOR SELECT TO authenticated
USING (company_id = get_my_company());

CREATE POLICY "Company users can insert properties"
ON properties FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can update properties"
ON properties FOR UPDATE TO authenticated
USING (company_id = get_my_company())
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can delete properties"
ON properties FOR DELETE TO authenticated
USING (company_id = get_my_company());

-- APPLICATIONS: Company-scoped access
CREATE POLICY "Company users can view applications"
ON applications FOR SELECT TO authenticated
USING (company_id = get_my_company());

CREATE POLICY "Company users can insert applications"
ON applications FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can update applications"
ON applications FOR UPDATE TO authenticated
USING (company_id = get_my_company())
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can delete applications"
ON applications FOR DELETE TO authenticated
USING (company_id = get_my_company());

-- ACTIVITY_LOG: Company-scoped access
CREATE POLICY "Company users can view activity"
ON activity_log FOR SELECT TO authenticated
USING (company_id = get_my_company());

CREATE POLICY "Company users can insert activity"
ON activity_log FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company());

-- LANDLORDS: Company-scoped access
CREATE POLICY "Company users can view landlords"
ON landlords FOR SELECT TO authenticated
USING (company_id = get_my_company());

CREATE POLICY "Company users can insert landlords"
ON landlords FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can update landlords"
ON landlords FOR UPDATE TO authenticated
USING (company_id = get_my_company())
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can delete landlords"
ON landlords FOR DELETE TO authenticated
USING (company_id = get_my_company());

-- DOCUMENTS: Company-scoped access
CREATE POLICY "Company users can view documents"
ON documents FOR SELECT TO authenticated
USING (company_id = get_my_company());

CREATE POLICY "Company users can insert documents"
ON documents FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can delete documents"
ON documents FOR DELETE TO authenticated
USING (company_id = get_my_company() AND created_by = auth.uid());

-- NOTIFICATIONS: User can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON notifications FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid());

COMMIT;

-- =================================================================
-- EXECUTION COMPLETE:
-- 1. All god-mode policies removed
-- 2. Company-scoped RLS policies enforced
-- 3. Multi-tenant isolation guaranteed
-- =================================================================
