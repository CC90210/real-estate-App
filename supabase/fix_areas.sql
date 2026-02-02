-- FIX AREAS RLS AND TABLE
-- Ensure areas table has necessary tracking for multi-tenancy

-- 1. Ensure company_id exists on areas
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'areas' AND column_name = 'company_id') THEN
        ALTER TABLE areas ADD COLUMN company_id UUID REFERENCES companies(id);
    END IF;
END $$;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_areas_company_id ON areas(company_id);

-- 3. Enable RLS
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Policy: Users can view areas from their company
DROP POLICY IF EXISTS "Users can view company areas" ON areas;
CREATE POLICY "Users can view company areas"
ON areas FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Policy: Admins and Agents can insert areas
DROP POLICY IF EXISTS "Admins and Agents can insert areas" ON areas;
CREATE POLICY "Admins and Agents can insert areas"
ON areas FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'agent')
  )
);

-- Policy: Admins can update/delete areas
DROP POLICY IF EXISTS "Admins can update areas" ON areas;
CREATE POLICY "Admins can update areas"
ON areas FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete areas" ON areas;
CREATE POLICY "Admins can delete areas"
ON areas FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 5. Fix Buildings Table (if it exists and is used in the query)
-- The query joins 'buildings', check if it needs company_id too for consistency, or if it inherits via area_id.
-- Usually easier to RLS buildings via area_id link, but strictly safer to have company_id.
-- Let's check RLS on buildings just in case.

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'buildings') THEN
         -- Ensure RLS is on
         ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
         
         -- Policy assuming buildings link to areas
         DROP POLICY IF EXISTS "Users can view company buildings" ON buildings;
         CREATE POLICY "Users can view company buildings"
         ON buildings FOR SELECT
         USING (
           area_id IN (
             SELECT id FROM areas WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
             )
           )
         );
    END IF;
END $$;
