-- Track which companies have automations enabled
CREATE TABLE IF NOT EXISTS automation_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    enabled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- What automations they have access to
    features JSONB DEFAULT '{
        "email_outbound": true,
        "social_posting": true,
        "ad_generation": true,
        "bulk_actions": true
    }',
    -- n8n webhook URLs for this company
    webhook_endpoints JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Log every automation action
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID REFERENCES profiles(id),
    
    -- What was triggered
    action_type TEXT NOT NULL, -- 'send_listing_email', 'post_social', etc.
    entity_type TEXT, -- 'property', 'application', 'building'
    entity_id UUID,
    
    -- Payload sent to n8n
    payload JSONB NOT NULL,
    
    -- Response from n8n
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    result JSONB,
    error_message TEXT,
    
    -- Timing
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_logs_company ON automation_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_status ON automation_logs(status);
CREATE INDEX IF NOT EXISTS idx_automation_logs_action ON automation_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_automation_logs_entity ON automation_logs(entity_type, entity_id);

-- RLS
ALTER TABLE automation_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's company_id (reusing from previous scripts if exists, or creating)
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE;

DROP POLICY IF EXISTS "Company can view own subscription" ON automation_subscriptions;
CREATE POLICY "Company can view own subscription"
ON automation_subscriptions FOR SELECT TO authenticated
USING (company_id = get_my_company_id());

DROP POLICY IF EXISTS "Company can view own logs" ON automation_logs;
CREATE POLICY "Company can view own logs"
ON automation_logs FOR SELECT TO authenticated
USING (company_id = get_my_company_id());

DROP POLICY IF EXISTS "Company can insert logs" ON automation_logs;
CREATE POLICY "Company can insert logs"
ON automation_logs FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company_id());

-- Update Existing trigger function to ensure subscriptions are created for new companies (Optional, but good for Tier 1)
-- For now, we manually insert or use a separate admin tool/webhook to enable automations. 
-- Or we can add a simple default insert for testing:
-- INSERT INTO automation_subscriptions (company_id) SELECT id FROM companies ON CONFLICT DO NOTHING;
