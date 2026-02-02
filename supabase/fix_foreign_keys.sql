-- ================================================
-- FIX FOREIGN KEY CONSTRAINTS FOR CLEAN DELETION
-- ================================================

-- 1. Drop and recreate activity_log foreign key with CASCADE
ALTER TABLE activity_log 
DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;

ALTER TABLE activity_log
ADD CONSTRAINT activity_log_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Fix other foreign keys that reference profiles
ALTER TABLE documents
DROP CONSTRAINT IF EXISTS documents_created_by_fkey;

ALTER TABLE documents
ADD CONSTRAINT documents_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE applications
DROP CONSTRAINT IF EXISTS applications_agent_id_fkey;

ALTER TABLE applications
ADD CONSTRAINT applications_agent_id_fkey
FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE commissions
DROP CONSTRAINT IF EXISTS commissions_agent_id_fkey;

ALTER TABLE commissions
ADD CONSTRAINT commissions_agent_id_fkey
FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE showings
DROP CONSTRAINT IF EXISTS showings_agent_id_fkey;

ALTER TABLE showings
ADD CONSTRAINT showings_agent_id_fkey
FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE team_invitations
DROP CONSTRAINT IF EXISTS team_invitations_invited_by_fkey;

ALTER TABLE team_invitations
ADD CONSTRAINT team_invitations_invited_by_fkey
FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE team_invitations
DROP CONSTRAINT IF EXISTS team_invitations_accepted_by_fkey;

ALTER TABLE team_invitations
ADD CONSTRAINT team_invitations_accepted_by_fkey
FOREIGN KEY (accepted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. Fix property references to use SET NULL instead of CASCADE for applications
ALTER TABLE applications
DROP CONSTRAINT IF EXISTS applications_property_id_fkey;

ALTER TABLE applications
ADD CONSTRAINT applications_property_id_fkey
FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL;
