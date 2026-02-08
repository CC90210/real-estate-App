-- ==============================================================================
-- WEBHOOK SCHEMA HOTFIX: Aligning Ledger with Dispatch Engine
-- This script fixes the "column response_code does not exist" error by 
-- synchronizing the webhook_events table with the modern dispatch requirements.
-- ==============================================================================

DO $$ 
BEGIN
    -- 1. Ensure Table Exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_events') THEN
        CREATE TABLE public.webhook_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            event_type TEXT NOT NULL,
            payload JSONB NOT NULL,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
            attempts INTEGER DEFAULT 0,
            last_attempt_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- 2. Add response_code if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'response_code') THEN
        ALTER TABLE public.webhook_events ADD COLUMN response_code INTEGER;
    END IF;

    -- 3. Handle error_message / response_body unification
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'response_body') THEN
        -- If response_body exists, we rename it to error_message to match the code
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'error_message') THEN
            ALTER TABLE public.webhook_events RENAME COLUMN response_body TO error_message;
        ELSE
            -- Both exist? Let's just drop the legacy one or keep it. Dropping is cleaner.
            ALTER TABLE public.webhook_events DROP COLUMN response_body;
        END IF;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'error_message') THEN
        -- Neither exist, add error_message
        ALTER TABLE public.webhook_events ADD COLUMN error_message TEXT;
    END IF;

END $$;

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE public.webhook_events IS 'Audit ledger for all outgoing webhook automation events';
