-- MULTI-TENANCY CORE
CREATE OR REPLACE FUNCTION get_my_company()
RETURNS UUID AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1. TEAM INVITATIONS
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'agent', 'landlord', 'tenant')),
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_pending_invitation UNIQUE (company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_company ON team_invitations(company_id);

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage company invitations" ON team_invitations;
CREATE POLICY "Admins can manage company invitations"
ON team_invitations FOR ALL TO authenticated
USING (
    company_id = get_my_company() AND
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Anyone can read invitation by token" ON team_invitations;
CREATE POLICY "Anyone can read invitation by token"
ON team_invitations FOR SELECT TO anon, authenticated
USING (token IS NOT NULL);

-- 2. AUTOMATION SETTINGS
CREATE TABLE IF NOT EXISTS automation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Document automations
    document_email_enabled BOOLEAN DEFAULT FALSE,
    document_email_recipients TEXT[] DEFAULT ARRAY['landlord'],
    document_email_template TEXT,
    
    -- Invoice automations
    invoice_email_enabled BOOLEAN DEFAULT FALSE,
    invoice_email_recipients TEXT[] DEFAULT ARRAY['tenant'],
    invoice_email_template TEXT,
    
    -- Webhook settings (for n8n integration)
    webhook_url TEXT,
    webhook_secret TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
    webhook_events TEXT[] DEFAULT ARRAY['document.created', 'invoice.created'],
    
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company isolation for automation_settings" ON automation_settings;
CREATE POLICY "Company isolation for automation_settings"
ON automation_settings FOR ALL TO authenticated
USING (company_id = get_my_company())
WITH CHECK (company_id = get_my_company());

-- 3. WEBHOOK EVENTS LOG
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    response_code INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company isolation for webhook_events" ON webhook_events;
CREATE POLICY "Company isolation for webhook_events"
ON webhook_events FOR ALL TO authenticated
USING (company_id = get_my_company());

CREATE INDEX IF NOT EXISTS idx_webhook_events_pending ON webhook_events(status, created_at) 
WHERE status IN ('pending', 'retrying');

-- 4. ENSURE ALL TABLES HAVE COMPANY_ID RLS
-- (Applying a standard isolation policy to key tables)

DO $$ 
DECLARE 
    tbl text;
BEGIN 
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'company_id' 
        AND table_schema = 'public'
        AND table_name NOT IN ('companies', 'profiles', 'team_invitations', 'automation_settings', 'webhook_events')
    LOOP 
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Company isolation for ' || tbl, tbl);
        EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated USING (company_id = get_my_company()) WITH CHECK (company_id = get_my_company())', 'Company isolation for ' || tbl, tbl);
    END LOOP;
END $$;
