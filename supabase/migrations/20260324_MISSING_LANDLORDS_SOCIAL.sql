-- ============================================================================
-- PropFlow: Missing Tables — landlords & agent_social_profiles
-- Date: 2026-03-24
--
-- These tables are referenced throughout the codebase but have no prior
-- migration tracking them. They likely already exist in the live database,
-- so every DDL statement uses IF NOT EXISTS / idempotent DO $$ blocks.
--
-- Tables created:
--   1. landlords              — property owner registry, scoped per company
--   2. agent_social_profiles  — per-user Late social profile mapping
--
-- Safe to run multiple times.
-- ============================================================================


-- ============================================================================
-- 1. landlords
--
-- Referenced by:
--   src/app/(dashboard)/landlords/page.tsx    — full CRUD, company_id scoped
--   src/lib/hooks/useProperties.ts            — select id by email
--   src/lib/hooks/useShowings.ts              — select id by email
--   src/components/QuickFind.tsx              — select id, name, email, company_name
--   src/components/mobile/MobileQuickFind.tsx — select id, name, email
--   src/components/dashboard/LandlordDashboard.tsx — select id by email
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.landlords (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name        text        NOT NULL,
    email       text        NOT NULL,
    phone       text,
    company_name text,                      -- the landlord's own company/organization name
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for the access patterns seen in code
CREATE INDEX IF NOT EXISTS idx_landlords_company_id
    ON public.landlords(company_id);

CREATE INDEX IF NOT EXISTS idx_landlords_email
    ON public.landlords(email);

-- Enable RLS
ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT — any authenticated user in the same company may view landlords
DO $$ BEGIN
    DROP POLICY IF EXISTS "landlords_select" ON public.landlords;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "landlords_select"
    ON public.landlords FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

-- Policy: INSERT — users may only insert landlords into their own company
DO $$ BEGIN
    DROP POLICY IF EXISTS "landlords_insert" ON public.landlords;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "landlords_insert"
    ON public.landlords FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

-- Policy: UPDATE — users may only update landlords in their own company
DO $$ BEGIN
    DROP POLICY IF EXISTS "landlords_update" ON public.landlords;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "landlords_update"
    ON public.landlords FOR UPDATE TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- Policy: DELETE — users may only delete landlords in their own company
DO $$ BEGIN
    DROP POLICY IF EXISTS "landlords_delete" ON public.landlords;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "landlords_delete"
    ON public.landlords FOR DELETE TO authenticated
    USING (company_id = public.get_user_company_id());


-- ============================================================================
-- 2. agent_social_profiles
--
-- Referenced by:
--   src/app/api/social/schedule/route.ts — select late_profile_id by user_id
--
-- Note: The main social integration has migrated to storing late_profile_id on
-- the companies table directly. This table remains as a per-user override/
-- legacy mapping that schedule/route.ts still queries.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agent_social_profiles (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    late_profile_id  text        NOT NULL,      -- Late API profile ID for this agent
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id)                             -- one Late profile per user
);

CREATE INDEX IF NOT EXISTS idx_agent_social_profiles_user_id
    ON public.agent_social_profiles(user_id);

-- Enable RLS
ALTER TABLE public.agent_social_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT — users may only read their own profile row
DO $$ BEGIN
    DROP POLICY IF EXISTS "agent_social_profiles_select" ON public.agent_social_profiles;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "agent_social_profiles_select"
    ON public.agent_social_profiles FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Policy: INSERT — users may only insert their own profile row
DO $$ BEGIN
    DROP POLICY IF EXISTS "agent_social_profiles_insert" ON public.agent_social_profiles;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "agent_social_profiles_insert"
    ON public.agent_social_profiles FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Policy: UPDATE — users may only update their own profile row
DO $$ BEGIN
    DROP POLICY IF EXISTS "agent_social_profiles_update" ON public.agent_social_profiles;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "agent_social_profiles_update"
    ON public.agent_social_profiles FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy: DELETE — users may only delete their own profile row
DO $$ BEGIN
    DROP POLICY IF EXISTS "agent_social_profiles_delete" ON public.agent_social_profiles;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "agent_social_profiles_delete"
    ON public.agent_social_profiles FOR DELETE TO authenticated
    USING (user_id = auth.uid());


-- ============================================================================
-- Reload PostgREST schema cache so these tables are immediately queryable
-- ============================================================================
NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- Verification — confirm both tables exist and are RLS-enabled
-- ============================================================================
SELECT
    relname              AS table_name,
    relrowsecurity       AS rls_enabled
FROM pg_class
WHERE relname IN ('landlords', 'agent_social_profiles')
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY relname;
