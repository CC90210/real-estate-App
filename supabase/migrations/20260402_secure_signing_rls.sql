-- ============================================================================
-- Secure signing request access
-- Removes broad anon table access from signing_requests.
-- Public signing is handled by Next.js server routes using the service role.
-- ============================================================================

DO $$ BEGIN
    DROP POLICY IF EXISTS "signing_requests_public_token_access" ON public.signing_requests;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

REVOKE ALL ON TABLE public.signing_requests FROM anon;
REVOKE ALL ON TABLE public.signing_audit_log FROM anon;

NOTIFY pgrst, 'reload schema';
