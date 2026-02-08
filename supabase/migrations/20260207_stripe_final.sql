-- Helper function for RLS (if not exists)
CREATE OR REPLACE FUNCTION get_my_company()
RETURNS UUID AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Subscription fields for companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

-- Stripe Connect fields for companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connect_enabled BOOLEAN DEFAULT FALSE;

-- Stripe customer ID for profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Tenant payments table (for Connect payments)
CREATE TABLE IF NOT EXISTS tenant_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    property_id UUID REFERENCES properties(id),
    tenant_name TEXT NOT NULL,
    tenant_email TEXT,
    amount INTEGER NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    stripe_payment_intent_id TEXT,
    stripe_checkout_session_id TEXT,
    paid_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for tenant_payments
ALTER TABLE tenant_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company isolation for tenant_payments" ON tenant_payments;
CREATE POLICY "Company isolation for tenant_payments"
ON tenant_payments FOR ALL TO authenticated
USING (company_id = get_my_company())
WITH CHECK (company_id = get_my_company());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_subscription ON companies(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_connect ON companies(stripe_connect_id);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_company ON tenant_payments(company_id);
