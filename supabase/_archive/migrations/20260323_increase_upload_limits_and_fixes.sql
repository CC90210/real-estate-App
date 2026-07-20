-- ============================================================================
-- Migration: Increase file upload limits + data flow fixes
-- Date: 2026-03-23
-- Description:
--   1. Increase storage bucket file_size_limit from 25MB to 50MB
--   2. Add gmail_oauth_tokens table for email automation
--   3. Fix any missing RLS policies for properties (client-side access)
-- ============================================================================

-- ─── 1. Increase storage bucket limits to 50MB ──────────────────────────────

UPDATE storage.buckets
SET file_size_limit = 52428800  -- 50 MB
WHERE id IN ('application-screening-reports', 'application-documents');

-- ─── 2. Gmail OAuth tokens for email automation ─────────────────────────────

CREATE TABLE IF NOT EXISTS gmail_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMPTZ NOT NULL,
    scopes TEXT[] DEFAULT ARRAY['https://www.googleapis.com/auth/gmail.send'],
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, email)
);

-- RLS for gmail_oauth_tokens
ALTER TABLE gmail_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's gmail tokens"
    ON gmail_oauth_tokens FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert gmail tokens for their company"
    ON gmail_oauth_tokens FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company's gmail tokens"
    ON gmail_oauth_tokens FOR UPDATE
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company's gmail tokens"
    ON gmail_oauth_tokens FOR DELETE
    USING (company_id = get_user_company_id());

-- ─── 3. Ensure properties has proper RLS for client-side reads ──────────────

-- Drop and recreate SELECT policy to ensure it exists and works
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their company properties" ON properties;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can view their company properties"
    ON properties FOR SELECT
    USING (company_id = get_user_company_id());

-- ─── 4. Ensure social_accounts has proper RLS ──────────────────────────────

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their company social accounts" ON social_accounts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can view their company social accounts"
    ON social_accounts FOR SELECT
    USING (company_id = get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can insert social accounts for their company" ON social_accounts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can insert social accounts for their company"
    ON social_accounts FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can update their company social accounts" ON social_accounts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can update their company social accounts"
    ON social_accounts FOR UPDATE
    USING (company_id = get_user_company_id());
