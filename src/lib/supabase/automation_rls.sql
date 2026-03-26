-- ============================================================
-- RLS Policies for Multi-Tenant Automation Tables
-- Tables: automation_settings, gmail_oauth_tokens, automation_logs
--
-- Run this in Supabase SQL Editor as a superuser.
-- Each company can ONLY access their own rows.
-- ============================================================

-- ─── automation_settings ────────────────────────────────────

ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "automation_settings_select_own_company" ON automation_settings;
DROP POLICY IF EXISTS "automation_settings_insert_own_company" ON automation_settings;
DROP POLICY IF EXISTS "automation_settings_update_own_company" ON automation_settings;
DROP POLICY IF EXISTS "automation_settings_delete_own_company" ON automation_settings;

CREATE POLICY "automation_settings_select_own_company"
  ON automation_settings FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "automation_settings_insert_own_company"
  ON automation_settings FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "automation_settings_update_own_company"
  ON automation_settings FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "automation_settings_delete_own_company"
  ON automation_settings FOR DELETE
  USING (company_id = public.get_user_company_id());


-- ─── gmail_oauth_tokens ─────────────────────────────────────

ALTER TABLE gmail_oauth_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gmail_tokens_select_own_company" ON gmail_oauth_tokens;
DROP POLICY IF EXISTS "gmail_tokens_insert_own_company" ON gmail_oauth_tokens;
DROP POLICY IF EXISTS "gmail_tokens_update_own_company" ON gmail_oauth_tokens;
DROP POLICY IF EXISTS "gmail_tokens_delete_own_company" ON gmail_oauth_tokens;

CREATE POLICY "gmail_tokens_select_own_company"
  ON gmail_oauth_tokens FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "gmail_tokens_insert_own_company"
  ON gmail_oauth_tokens FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "gmail_tokens_update_own_company"
  ON gmail_oauth_tokens FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "gmail_tokens_delete_own_company"
  ON gmail_oauth_tokens FOR DELETE
  USING (company_id = public.get_user_company_id());


-- ─── automation_logs ────────────────────────────────────────

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_logs_select_own_company" ON automation_logs;
DROP POLICY IF EXISTS "automation_logs_insert_own_company" ON automation_logs;

CREATE POLICY "automation_logs_select_own_company"
  ON automation_logs FOR SELECT
  USING (company_id = public.get_user_company_id());

-- Insert-only for automation_logs (append-only audit trail)
CREATE POLICY "automation_logs_insert_own_company"
  ON automation_logs FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

-- No UPDATE or DELETE policies on automation_logs — audit trail is immutable
