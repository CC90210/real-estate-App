-- ============================================================================
-- PROPERTIES TABLE — Company-Scoped RLS Policies
-- WARNING: Previous version used USING (true) which allowed cross-tenant access.
--          These policies enforce proper company isolation.
--
-- BEFORE RUNNING: Drop the old god-mode policies if they exist:
--   DROP POLICY IF EXISTS "Enable delete for authenticated users" ON "public"."properties";
--   DROP POLICY IF EXISTS "Enable update for authenticated users" ON "public"."properties";
--   DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "public"."properties";
-- ============================================================================

ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only read properties belonging to their company
CREATE POLICY "properties_select_company"
ON "public"."properties"
FOR SELECT
TO authenticated
USING (company_id = get_user_company_id());

-- INSERT: Users can only create properties in their own company
CREATE POLICY "properties_insert_company"
ON "public"."properties"
FOR INSERT
TO authenticated
WITH CHECK (company_id = get_user_company_id());

-- UPDATE: Users can only update properties in their own company
CREATE POLICY "properties_update_company"
ON "public"."properties"
FOR UPDATE
TO authenticated
USING (company_id = get_user_company_id())
WITH CHECK (company_id = get_user_company_id());

-- DELETE: Users can only delete properties in their own company
CREATE POLICY "properties_delete_company"
ON "public"."properties"
FOR DELETE
TO authenticated
USING (company_id = get_user_company_id());
