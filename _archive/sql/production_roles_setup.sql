-- =============================================
-- ROLE-BASED ACCESS CONTROL (RBAC) SETUP
-- =============================================

-- STEP 1: Update Profiles Table
-- Add role column if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agent';

-- Add constraint for valid roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'agent', 'landlord', 'tenant')); -- Added tenant just in case

-- Update existing users to admin (they're the first users)
UPDATE profiles SET role = 'admin' WHERE role IS NULL OR role = '';

-- STEP 2: Create Landlord-Property Assignment Table
CREATE TABLE IF NOT EXISTS landlord_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(landlord_id, property_id)
);

-- Enable RLS
ALTER TABLE landlord_properties ENABLE ROW LEVEL SECURITY;

-- Policy: Company members can manage assignments
DROP POLICY IF EXISTS "landlord_properties_select" ON landlord_properties;
CREATE POLICY "landlord_properties_select" ON landlord_properties 
FOR SELECT TO authenticated
USING (
    landlord_id IN (SELECT id FROM profiles WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "landlord_properties_insert" ON landlord_properties;
CREATE POLICY "landlord_properties_insert" ON landlord_properties 
FOR INSERT TO authenticated
WITH CHECK (
    landlord_id IN (SELECT id FROM profiles WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "landlord_properties_delete" ON landlord_properties;
CREATE POLICY "landlord_properties_delete" ON landlord_properties 
FOR DELETE TO authenticated
USING (
    landlord_id IN (SELECT id FROM profiles WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_landlord_properties_landlord ON landlord_properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_landlord_properties_property ON landlord_properties(property_id);

-- STEP 3: Create Helper Functions
-- Function to get property IDs a landlord can access
CREATE OR REPLACE FUNCTION get_my_property_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT property_id 
    FROM landlord_properties 
    WHERE landlord_id = auth.uid()
$$;

-- Function to check if user is landlord
CREATE OR REPLACE FUNCTION is_landlord()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (SELECT role = 'landlord' FROM profiles WHERE id = auth.uid()),
        false
    )
$$;

-- STEP 4: Update RLS Policies for Landlord Access

-- PROPERTIES
DROP POLICY IF EXISTS "properties_select" ON properties;
CREATE POLICY "properties_select" ON properties 
FOR SELECT TO authenticated
USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) 
    AND (
        NOT is_landlord()
        OR
        id IN (SELECT get_my_property_ids())
    )
);

-- APPLICATIONS
DROP POLICY IF EXISTS "applications_select" ON applications;
CREATE POLICY "applications_select" ON applications 
FOR SELECT TO authenticated
USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) 
    AND (
        NOT is_landlord()
        OR property_id IN (SELECT get_my_property_ids())
    )
);

-- LEASES
DROP POLICY IF EXISTS "leases_select" ON leases;
CREATE POLICY "leases_select" ON leases 
FOR SELECT TO authenticated
USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) 
    AND (
        NOT is_landlord()
        OR property_id IN (SELECT get_my_property_ids())
    )
);

-- MAINTENANCE_REQUESTS
DROP POLICY IF EXISTS "maintenance_requests_select" ON maintenance_requests;
CREATE POLICY "maintenance_requests_select" ON maintenance_requests 
FOR SELECT TO authenticated
USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) 
    AND (
        NOT is_landlord()
        OR property_id IN (SELECT get_my_property_ids())
    )
);

-- INVOICES
DROP POLICY IF EXISTS "invoices_select" ON invoices;
CREATE POLICY "invoices_select" ON invoices 
FOR SELECT TO authenticated
USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) 
    AND (
        NOT is_landlord()
        OR property_id IN (SELECT get_my_property_ids())
    )
);
