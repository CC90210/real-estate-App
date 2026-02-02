-- Add email column to companies table if it doesn't exist
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS email text;

-- Make sure RLS policies allow the insert if needed (though usually company creation is less restricted during signup if properly set up)
-- or check if specific permissions are needed. 
-- For now, adding the column is the primary fix for the reported error.
