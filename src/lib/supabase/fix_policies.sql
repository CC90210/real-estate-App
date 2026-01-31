
-- Enable DELETE for authenticated users on applications table
create policy "Enable delete for users based on user_id"
on "public"."applications"
as permissive
for delete
to authenticated
using (auth.uid() = agent_id); -- Assuming agent_id links to auth.users.id

-- Alternatively, a broader policy for development/small teams:
-- create policy "Enable delete for authenticated users"
-- on "public"."applications"
-- for delete
-- to authenticated
-- using (true);

-- Ensure activity_log can be deleted (for the cleanup step)
create policy "Enable delete for activity_log"
on "public"."activity_log"
for delete
to authenticated
using (true);

-- Fix foreign key constraints to be CASCADE if possible (Maintenance)
-- This snippet tries to alter the constraint if it exists. 
-- Note: You might need to know the exact constraint name. 
-- This is a generic "If you were building this from scratch" approach.

-- ALTER TABLE activity_log
-- DROP CONSTRAINT IF EXISTS activity_log_entity_id_fkey, -- Example name
-- ADD CONSTRAINT activity_log_application_fkey
-- FOREIGN KEY (entity_id)
-- REFERENCES applications(id)
-- ON DELETE CASCADE;
