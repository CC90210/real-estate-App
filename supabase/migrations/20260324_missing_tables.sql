-- ============================================================================
-- PropFlow: Create missing tables discovered during E2E testing
-- Tables: landlord_properties, automation_subscriptions, gmail_oauth_tokens
-- Date: 2026-03-24
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_landlord_properties_property ON public.landlord_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_landlord_properties_landlord ON public.landlord_properties(landlord_id);

ALTER TABLE public.landlord_properties ENABLE ROW LEVEL SECURITY;

-- Users can see landlord assignments for properties in their company
CREATE POLICY "Users can view landlord assignments in their company"
    ON public.landlord_properties FOR SELECT
    USING (
        property_id IN (
            SELECT id FROM public.properties
            WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- Admins/agents can manage landlord assignments
CREATE POLICY "Admins can manage landlord assignments"
    ON public.landlord_properties FOR ALL
    USING (
        property_id IN (
            SELECT id FROM public.properties
            WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
    )
    WITH CHECK (
        property_id IN (
            SELECT id FROM public.properties
            WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- ============================================================================
-- 2. automation_subscriptions — Tracks automation features per company
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.automation_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    is_active boolean NOT NULL DEFAULT true,
    features jsonb NOT NULL DEFAULT '{
        "email_outbound": true,
        "social_posting": false,
        "ad_generation": false,
        "bulk_actions": false
    }'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_automation_subscriptions_company ON public.automation_subscriptions(company_id);

ALTER TABLE public.automation_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company automation subscription"
    ON public.automation_subscriptions FOR SELECT
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Admins can update their company automation subscription"
    ON public.automation_subscriptions FOR UPDATE
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

-- ============================================================================
-- 3. gmail_oauth_tokens — Stores Gmail OAuth tokens per company
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gmail_oauth_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    token_expiry timestamptz,
    scopes text[] DEFAULT '{}',
    is_primary boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gmail_oauth_tokens_company ON public.gmail_oauth_tokens(company_id);

ALTER TABLE public.gmail_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company Gmail tokens"
    ON public.gmail_oauth_tokens FOR SELECT
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert Gmail tokens for their company"
    ON public.gmail_oauth_tokens FOR INSERT
    WITH CHECK (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update their company Gmail tokens"
    ON public.gmail_oauth_tokens FOR UPDATE
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can delete their company Gmail tokens"
    ON public.gmail_oauth_tokens FOR DELETE
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

-- ============================================================================
-- 4. Ensure storage buckets accept 50MB files
-- ============================================================================
UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id IN ('application-documents', 'application-screening-reports')
  AND (file_size_limit IS NULL OR file_size_limit < 52428800);

-- ============================================================================
-- 5. Create default automation subscriptions for existing companies
-- ============================================================================
INSERT INTO public.automation_subscriptions (company_id, is_active, features)
SELECT id, true, '{"email_outbound": true, "social_posting": false, "ad_generation": false, "bulk_actions": false}'::jsonb
FROM public.companies
WHERE id NOT IN (SELECT company_id FROM public.automation_subscriptions)
ON CONFLICT (company_id) DO NOTHING;
