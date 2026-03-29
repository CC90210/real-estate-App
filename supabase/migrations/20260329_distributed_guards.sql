-- ============================================================================
-- DISTRIBUTED BACKEND GUARDS
-- Shared rate limiting and incoming webhook idempotency for multi-instance
-- deployments. Service-role only; no direct client access.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
    scope TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (scope, window_start)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_expires_at
    ON public.api_rate_limits (expires_at);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access to api_rate_limits" ON public.api_rate_limits;
REVOKE ALL ON TABLE public.api_rate_limits FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.incoming_webhook_events (
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    payload_hash TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_incoming_webhook_events_expires_at
    ON public.incoming_webhook_events (expires_at);

ALTER TABLE public.incoming_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access to incoming_webhook_events" ON public.incoming_webhook_events;
REVOKE ALL ON TABLE public.incoming_webhook_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_scope TEXT,
    p_limit INTEGER,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE (
    allowed BOOLEAN,
    current_count INTEGER,
    reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_window_seconds INTEGER := GREATEST(COALESCE(p_window_seconds, 60), 1);
    v_window_start TIMESTAMPTZ;
    v_expires_at TIMESTAMPTZ;
BEGIN
    IF p_scope IS NULL OR BTRIM(p_scope) = '' THEN
        RAISE EXCEPTION 'p_scope must not be blank';
    END IF;

    IF p_limit IS NULL OR p_limit < 1 THEN
        RAISE EXCEPTION 'p_limit must be at least 1';
    END IF;

    DELETE FROM public.api_rate_limits
    WHERE expires_at < v_now;

    v_window_start := TO_TIMESTAMP(
        FLOOR(EXTRACT(EPOCH FROM v_now) / v_window_seconds) * v_window_seconds
    );
    v_expires_at := v_window_start + MAKE_INTERVAL(secs => v_window_seconds * 2);

    INSERT INTO public.api_rate_limits (
        scope,
        window_start,
        count,
        expires_at,
        created_at,
        updated_at
    )
    VALUES (
        p_scope,
        v_window_start,
        1,
        v_expires_at,
        v_now,
        v_now
    )
    ON CONFLICT (scope, window_start)
    DO UPDATE SET
        count = public.api_rate_limits.count + 1,
        expires_at = EXCLUDED.expires_at,
        updated_at = v_now
    RETURNING public.api_rate_limits.count INTO current_count;

    allowed := current_count <= p_limit;
    reset_at := v_window_start + MAKE_INTERVAL(secs => v_window_seconds);
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_incoming_webhook_event(
    p_provider TEXT,
    p_event_id TEXT,
    p_payload_hash TEXT DEFAULT NULL,
    p_ttl_seconds INTEGER DEFAULT 86400
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_inserted INTEGER := 0;
BEGIN
    IF p_provider IS NULL OR BTRIM(p_provider) = '' THEN
        RAISE EXCEPTION 'p_provider must not be blank';
    END IF;

    IF p_event_id IS NULL OR BTRIM(p_event_id) = '' THEN
        RAISE EXCEPTION 'p_event_id must not be blank';
    END IF;

    DELETE FROM public.incoming_webhook_events
    WHERE expires_at < v_now;

    INSERT INTO public.incoming_webhook_events (
        provider,
        event_id,
        payload_hash,
        expires_at
    )
    VALUES (
        p_provider,
        p_event_id,
        p_payload_hash,
        v_now + MAKE_INTERVAL(secs => GREATEST(COALESCE(p_ttl_seconds, 86400), 60))
    )
    ON CONFLICT (provider, event_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.register_incoming_webhook_event(TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.api_rate_limits IS 'Shared rate-limit buckets for server-side backend protection';
COMMENT ON TABLE public.incoming_webhook_events IS 'Durable dedupe ledger for third-party webhook deliveries';

NOTIFY pgrst, 'reload schema';
