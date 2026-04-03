-- ============================================================================
-- PropFlow: Native E-Sign System — Phase 6 (Documents & E-Sign)
-- Date: 2026-03-29
--
-- Creates:
--   1. signing_requests     — tracks each document sent for signature
--   2. signing_audit_log    — immutable compliance audit trail
--   3. RLS policies         — company-scoped authenticated access only
--   4. companies branding   — primary_color, email_footer_text columns
--
-- Safe to run multiple times (all statements are idempotent).
-- ============================================================================


-- ============================================================================
-- 1. signing_requests — one row per document-signature request
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.signing_requests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    document_id         UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    title               TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'rejected', 'expired', 'cancelled')),
    sender_id           UUID NOT NULL REFERENCES auth.users(id),
    recipient_email     TEXT NOT NULL,
    recipient_name      TEXT,
    message             TEXT,
    document_url        TEXT,
    signing_token       UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    signed_at           TIMESTAMPTZ,
    signature_data      JSONB,
    signed_document_url TEXT,
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    viewed_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signing_requests_company
    ON public.signing_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_signing_requests_status
    ON public.signing_requests(status);
CREATE INDEX IF NOT EXISTS idx_signing_requests_signing_token
    ON public.signing_requests(signing_token);
CREATE INDEX IF NOT EXISTS idx_signing_requests_recipient_email
    ON public.signing_requests(recipient_email);

ALTER TABLE public.signing_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated company members: full CRUD scoped to their company
DO $$ BEGIN
    DROP POLICY IF EXISTS "signing_requests_select" ON public.signing_requests;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "signing_requests_select"
    ON public.signing_requests FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "signing_requests_insert" ON public.signing_requests;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "signing_requests_insert"
    ON public.signing_requests FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "signing_requests_update" ON public.signing_requests;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "signing_requests_update"
    ON public.signing_requests FOR UPDATE TO authenticated
    USING (company_id = public.get_user_company_id());

DO $$ BEGIN
    DROP POLICY IF EXISTS "signing_requests_delete" ON public.signing_requests;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "signing_requests_delete"
    ON public.signing_requests FOR DELETE TO authenticated
    USING (company_id = public.get_user_company_id());

-- Public signing requests are served through authenticated Next.js API routes
-- using the service role. Do not grant anon direct table reads here.
DO $$ BEGIN
    DROP POLICY IF EXISTS "signing_requests_public_token_access" ON public.signing_requests;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

REVOKE ALL ON TABLE public.signing_requests FROM anon;


-- ============================================================================
-- 2. signing_audit_log — immutable audit trail (no UPDATE/DELETE allowed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.signing_audit_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signing_request_id  UUID NOT NULL REFERENCES public.signing_requests(id) ON DELETE CASCADE,
    action              TEXT NOT NULL,
    actor_email         TEXT,
    ip_address          TEXT,
    user_agent          TEXT,
    metadata            JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signing_audit_log_request
    ON public.signing_audit_log(signing_request_id);
CREATE INDEX IF NOT EXISTS idx_signing_audit_log_created
    ON public.signing_audit_log(created_at DESC);

ALTER TABLE public.signing_audit_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read audit entries for requests in their company.
-- No INSERT/UPDATE/DELETE granted via RLS — writes must use the service role
-- key from API routes to preserve the immutable audit guarantee.
DO $$ BEGIN
    DROP POLICY IF EXISTS "signing_audit_log_select" ON public.signing_audit_log;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "signing_audit_log_select"
    ON public.signing_audit_log FOR SELECT TO authenticated
    USING (
        signing_request_id IN (
            SELECT id FROM public.signing_requests
            WHERE company_id = public.get_user_company_id()
        )
    );


-- ============================================================================
-- 3. updated_at trigger for signing_requests
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_signing_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS trg_signing_requests_updated_at ON public.signing_requests;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE TRIGGER trg_signing_requests_updated_at
    BEFORE UPDATE ON public.signing_requests
    FOR EACH ROW EXECUTE FUNCTION public.set_signing_requests_updated_at();


-- ============================================================================
-- 4. Company branding columns
--    primary_color      — hex colour used in outbound signing emails
--    email_footer_text  — optional legal / contact blurb appended to emails
-- ============================================================================
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS primary_color      TEXT DEFAULT '#3b82f6',
    ADD COLUMN IF NOT EXISTS email_footer_text  TEXT;


-- ============================================================================
-- Reload PostgREST schema cache
-- ============================================================================
NOTIFY pgrst, 'reload schema';
