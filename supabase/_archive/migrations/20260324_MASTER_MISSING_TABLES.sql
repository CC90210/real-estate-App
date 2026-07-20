-- ============================================================================
-- PropFlow: MASTER Migration — All Missing Tables & Dependencies
-- Run this ONCE in Supabase Dashboard > SQL Editor
-- Date: 2026-03-24
--
-- Creates/ensures:
--   1. Helper functions: get_user_company_id(), get_my_company()
--   2. landlord_properties (join table)
--   3. automation_configs (per-company automation configuration)
--   4. automation_executions (execution history/metrics)
--   5. gmail_oauth_tokens (Gmail OAuth for email automation)
--   6. Storage buckets: logos, media
--   7. Default automation subscriptions for existing companies
--   8. Storage bucket size limits (50MB)
--
-- Safe to run multiple times (all statements are idempotent).
-- ============================================================================


-- ============================================================================
-- 0. HELPER FUNCTIONS — required by RLS policies throughout the app
-- ============================================================================

-- get_my_company() — used by older migrations
CREATE OR REPLACE FUNCTION public.get_my_company()
RETURNS UUID AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- get_user_company_id() — used by newer migrations
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT company_id INTO v_company_id
    FROM profiles
    WHERE id = auth.uid();
    RETURN v_company_id;
END;
$$;


-- ============================================================================
-- 1. landlord_properties — Join table for assigning landlords to properties
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.landlord_properties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(landlord_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_landlord_properties_property
    ON public.landlord_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_landlord_properties_landlord
    ON public.landlord_properties(landlord_id);

ALTER TABLE public.landlord_properties ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view landlord assignments in their company"
        ON public.landlord_properties;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can view landlord assignments in their company"
    ON public.landlord_properties FOR SELECT
    USING (
        property_id IN (
            SELECT id FROM public.properties
            WHERE company_id = public.get_user_company_id()
        )
    );

DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can manage landlord assignments"
        ON public.landlord_properties;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Admins can manage landlord assignments"
    ON public.landlord_properties FOR ALL
    USING (
        property_id IN (
            SELECT id FROM public.properties
            WHERE company_id = public.get_user_company_id()
        )
    )
    WITH CHECK (
        property_id IN (
            SELECT id FROM public.properties
            WHERE company_id = public.get_user_company_id()
        )
    );


-- ============================================================================
-- 2. automation_configs — Per-company automation configurations
--    Used by: /automations page, /api/automations/purchase
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.automation_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type text NOT NULL,                          -- e.g. 'email_outbound', 'social_posting'
    name text,                                   -- display name
    status text NOT NULL DEFAULT 'inactive'
        CHECK (status IN ('active', 'inactive', 'pending', 'error')),
    purchased_at timestamptz,
    implementation_fee_paid boolean DEFAULT false,
    config jsonb DEFAULT '{}'::jsonb,            -- type-specific settings
    total_executions integer DEFAULT 0,
    successful_executions integer DEFAULT 0,
    last_execution_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(company_id, type)
);

CREATE INDEX IF NOT EXISTS idx_automation_configs_company
    ON public.automation_configs(company_id);

ALTER TABLE public.automation_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "automation_configs_select" ON public.automation_configs;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "automation_configs_select"
    ON public.automation_configs FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "automation_configs_insert" ON public.automation_configs;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "automation_configs_insert"
    ON public.automation_configs FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "automation_configs_update" ON public.automation_configs;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "automation_configs_update"
    ON public.automation_configs FOR UPDATE TO authenticated
    USING (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "automation_configs_delete" ON public.automation_configs;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "automation_configs_delete"
    ON public.automation_configs FOR DELETE TO authenticated
    USING (company_id = public.get_user_company_id());


-- ============================================================================
-- 3. automation_executions — Execution log for automation metrics dashboard
--    Used by: automation-metrics.tsx
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.automation_executions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id uuid NOT NULL REFERENCES public.automation_configs(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'success', 'failed')),
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    duration_ms integer,
    error_message text,
    input_payload jsonb DEFAULT '{}'::jsonb,
    output_payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_executions_automation
    ON public.automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_started
    ON public.automation_executions(started_at DESC);

ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

-- Users can see executions for automations in their company
DO $$ BEGIN
    DROP POLICY IF EXISTS "automation_executions_select" ON public.automation_executions;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "automation_executions_select"
    ON public.automation_executions FOR SELECT TO authenticated
    USING (
        automation_id IN (
            SELECT id FROM public.automation_configs
            WHERE company_id = public.get_user_company_id()
        )
    );


-- ============================================================================
-- 4. gmail_oauth_tokens — Stores Gmail OAuth tokens per company
--    Used by: email automation, /api/gmail/* routes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gmail_oauth_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    token_expiry timestamptz,
    scopes text[] DEFAULT ARRAY['https://www.googleapis.com/auth/gmail.send'],
    is_primary boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_gmail_oauth_tokens_company
    ON public.gmail_oauth_tokens(company_id);

ALTER TABLE public.gmail_oauth_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "gmail_tokens_select" ON public.gmail_oauth_tokens;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "gmail_tokens_select"
    ON public.gmail_oauth_tokens FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "gmail_tokens_insert" ON public.gmail_oauth_tokens;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "gmail_tokens_insert"
    ON public.gmail_oauth_tokens FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "gmail_tokens_update" ON public.gmail_oauth_tokens;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "gmail_tokens_update"
    ON public.gmail_oauth_tokens FOR UPDATE TO authenticated
    USING (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "gmail_tokens_delete" ON public.gmail_oauth_tokens;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "gmail_tokens_delete"
    ON public.gmail_oauth_tokens FOR DELETE TO authenticated
    USING (company_id = public.get_user_company_id());


-- ============================================================================
-- 5. Storage Buckets — logos, media
--    Used by: settings page (company logo upload), social media (media upload)
-- ============================================================================

-- Create 'logos' bucket for company logo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'logos', 'logos', true, 5242880,
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Create 'media' bucket for social media uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'media', 'media', true, 52428800,
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: logos bucket
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Authenticated users can upload logos"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'logos');

DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Anyone can view logos"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'logos');

-- Storage RLS: media bucket
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Authenticated users can upload media"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'media');

DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Anyone can view media"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'media');


-- ============================================================================
-- 6. Ensure existing storage buckets accept 50MB files
-- ============================================================================
UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id IN ('application-documents', 'application-screening-reports')
  AND (file_size_limit IS NULL OR file_size_limit < 52428800);


-- ============================================================================
-- 7. Seed default automation subscriptions for existing companies
-- ============================================================================
INSERT INTO public.automation_subscriptions (company_id, is_active, features)
SELECT id, true, '{"email_outbound": true, "social_posting": false, "ad_generation": false, "bulk_actions": false}'::jsonb
FROM public.companies
WHERE id NOT IN (SELECT company_id FROM public.automation_subscriptions)
ON CONFLICT (company_id) DO NOTHING;


-- ============================================================================
-- DONE. All 6 missing tables + 2 storage buckets + helper functions created.
-- ============================================================================
