-- ============================================================================
-- PropFlow: Social Media Tables (social_accounts + social_posts)
-- Date: 2026-03-30
--
-- These tables are referenced throughout the social media suite but were
-- never tracked in migration files. They may already exist in the live DB.
-- All statements are idempotent (IF NOT EXISTS / DO $$ blocks).
-- ============================================================================


-- ============================================================================
-- 1. social_accounts — connected social media accounts per company
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.social_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    late_account_id TEXT NOT NULL,
    platform        TEXT NOT NULL,
    account_name    TEXT NOT NULL DEFAULT '',
    account_avatar  TEXT,
    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'disconnected')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate Late accounts within same company
DO $$ BEGIN
    ALTER TABLE public.social_accounts
        ADD CONSTRAINT uq_social_accounts_late_id UNIQUE (late_account_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_social_accounts_company
    ON public.social_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform
    ON public.social_accounts(platform);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "social_accounts_select" ON public.social_accounts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "social_accounts_select"
    ON public.social_accounts FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "social_accounts_insert" ON public.social_accounts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "social_accounts_insert"
    ON public.social_accounts FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "social_accounts_update" ON public.social_accounts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "social_accounts_update"
    ON public.social_accounts FOR UPDATE TO authenticated
    USING (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "social_accounts_delete" ON public.social_accounts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "social_accounts_delete"
    ON public.social_accounts FOR DELETE TO authenticated
    USING (company_id = public.get_user_company_id());


-- ============================================================================
-- 2. social_posts — scheduled and published social media posts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.social_posts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    late_post_id    TEXT,
    content         TEXT NOT NULL DEFAULT '',
    media_urls      TEXT[] DEFAULT '{}',
    hashtags        TEXT[] DEFAULT '{}',
    platforms       TEXT[] NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
    scheduled_for   TIMESTAMPTZ,
    published_at    TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_company
    ON public.social_posts(company_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status
    ON public.social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_created
    ON public.social_posts(created_at DESC);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "social_posts_select" ON public.social_posts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "social_posts_select"
    ON public.social_posts FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "social_posts_insert" ON public.social_posts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "social_posts_insert"
    ON public.social_posts FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "social_posts_update" ON public.social_posts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "social_posts_update"
    ON public.social_posts FOR UPDATE TO authenticated
    USING (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "social_posts_delete" ON public.social_posts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "social_posts_delete"
    ON public.social_posts FOR DELETE TO authenticated
    USING (company_id = public.get_user_company_id());


-- ============================================================================
-- 3. updated_at trigger for social_posts
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_social_posts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS trg_social_posts_updated_at ON public.social_posts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE TRIGGER trg_social_posts_updated_at
    BEFORE UPDATE ON public.social_posts
    FOR EACH ROW EXECUTE FUNCTION public.set_social_posts_updated_at();


-- ============================================================================
-- Reload PostgREST schema cache
-- ============================================================================
NOTIFY pgrst, 'reload schema';
