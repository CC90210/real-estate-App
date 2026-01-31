-- Enable RLS on properties table if not already enabled (though likely it is)
ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;

-- Create DELETE policy for properties
-- This allows any authenticated user to delete a property.
-- Ideally, you'd check if the user is an admin or the owner, but for now, authenticated is the step.
CREATE POLICY "Enable delete for authenticated users" 
ON "public"."properties" 
FOR DELETE 
TO authenticated 
USING (true);

-- Also ensure UPDATE is allowed for changing status
CREATE POLICY "Enable update for authenticated users" 
ON "public"."properties" 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Ensure SELECT is open (likely already exists, but good to double check)
CREATE POLICY "Enable read access for authenticated users" 
ON "public"."properties" 
FOR SELECT 
TO authenticated 
USING (true);
