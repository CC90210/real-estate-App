-- ============================================
-- PROPFLOW EMERGENCY RECOVERY SCRIPT 2026
-- ============================================

-- 1. ADD ADMIN FLAGS TO PROFILES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_type TEXT; -- 'founding', 'enterprise', 'standard'

-- 2. UPDATE COMPANIES WITH SUBSCRIPTION COLUMNS
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'essentials';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- 3. CREATE CORE UTILITY FUNCTION
CREATE OR REPLACE FUNCTION get_my_company()
RETURNS UUID AS $$
    SELECT company_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_my_company() TO authenticated;

-- 4. CREATE CONTACTS TABLE
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    type TEXT NOT NULL DEFAULT 'prospect' CHECK (type IN ('prospect', 'tenant', 'vendor', 'landlord')),
    company_name TEXT,
    address TEXT,
    tags TEXT[],
    notes TEXT,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    source TEXT,
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Company isolation for contacts" ON contacts FOR ALL TO authenticated
    USING (company_id = get_my_company())
    WITH CHECK (company_id = get_my_company());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_company_type ON contacts(company_id, type);
CREATE INDEX IF NOT EXISTS idx_contacts_company_email ON contacts(company_id, email);
CREATE INDEX IF NOT EXISTS idx_contacts_company_name ON contacts(company_id, name);

-- 5. CREATE ACTIVITY LOG TABLE
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Company isolation for activity_log" ON activity_log FOR ALL TO authenticated
    USING (company_id = get_my_company())
    WITH CHECK (company_id = get_my_company());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_activity_log_company_created ON activity_log(company_id, created_at DESC);

-- 6. CREATE NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('application', 'document', 'maintenance', 'payment', 'system', 'automation')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users see their notifications" ON notifications FOR SELECT TO authenticated
    USING (company_id = get_my_company() AND (user_id IS NULL OR user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(company_id, user_id, read, created_at DESC);

-- 7. CREATE AREAS TABLE
CREATE TABLE IF NOT EXISTS areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'Canada',
    property_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Company isolation for areas" ON areas FOR ALL TO authenticated
    USING (company_id = get_my_company())
    WITH CHECK (company_id = get_my_company());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. CREATE LEASES TABLE
CREATE TABLE IF NOT EXISTS leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount INTEGER NOT NULL,
    security_deposit INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
    lease_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    terms JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Company isolation for leases" ON leases FOR ALL TO authenticated
    USING (company_id = get_my_company())
    WITH CHECK (company_id = get_my_company());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 9. CREATE MAINTENANCE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT CHECK (category IN ('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest', 'other')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    assigned_to UUID REFERENCES contacts(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    completed_at TIMESTAMPTZ,
    photos TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Company isolation for maintenance_requests" ON maintenance_requests FOR ALL TO authenticated
    USING (company_id = get_my_company())
    WITH CHECK (company_id = get_my_company());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 10. CREATE APPROVALS TABLE
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    requested_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    decided_by UUID REFERENCES auth.users(id),
    decided_at TIMESTAMPTZ,
    decision_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Company isolation for approvals" ON approvals FOR ALL TO authenticated
    USING (company_id = get_my_company())
    WITH CHECK (company_id = get_my_company());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 11. CREATE AUTOMATION CONFIGS TABLE
CREATE TABLE IF NOT EXISTS automation_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('document_sender', 'invoice_sender', 'email_agent', 'voice_agent', 'review_agent', 'lead_agent')),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'paused', 'error')),
    config JSONB NOT NULL DEFAULT '{}',
    webhook_url TEXT,
    webhook_secret TEXT,
    purchased_at TIMESTAMPTZ,
    implementation_fee_paid BOOLEAN DEFAULT FALSE,
    monthly_fee INTEGER,
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE automation_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Company isolation for automation_configs" ON automation_configs FOR ALL TO authenticated
    USING (company_id = get_my_company())
    WITH CHECK (company_id = get_my_company());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 12. CREATE AUTOMATION EXECUTIONS TABLE
CREATE TABLE IF NOT EXISTS automation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES automation_configs(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    trigger_type TEXT,
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER
);

ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Company isolation for automation_executions" ON automation_executions FOR ALL TO authenticated
    USING (company_id = get_my_company())
    WITH CHECK (company_id = get_my_company());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 13. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_properties_company_id ON properties(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_company_id ON applications(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_showings_company_id ON showings(company_id);
CREATE INDEX IF NOT EXISTS idx_showings_date ON showings(company_id, scheduled_at);
