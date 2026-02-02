-- =================================================================
-- COMMISSIONS TABLE MIGRATION
-- =================================================================
-- Creates a commissions table for tracking agent commissions
-- with proper RLS policies for multi-tenant security.
-- =================================================================

BEGIN;

-- 1. Create commissions table
CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    company_id UUID NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'paid')) DEFAULT 'pending',
    description TEXT,
    earned_date DATE DEFAULT CURRENT_DATE,
    paid_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_commissions_company_id ON commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_commissions_agent_id ON commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_commissions_property_id ON commissions(property_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_earned_date ON commissions(earned_date);

-- 3. Enable RLS
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own commissions" ON commissions;
DROP POLICY IF EXISTS "Admins can view all company commissions" ON commissions;
DROP POLICY IF EXISTS "Admins can manage commissions" ON commissions;

-- 5. Create secure RLS policies
-- Agents can only see their own commissions
CREATE POLICY "Users can view own commissions"
ON commissions FOR SELECT TO authenticated
USING (
    agent_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'landlord')
        AND company_id = commissions.company_id
    )
);

-- Admins can insert/update commissions
CREATE POLICY "Admins can insert commissions"
ON commissions FOR INSERT TO authenticated
WITH CHECK (
    company_id = get_my_company()
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'landlord')
    )
);

CREATE POLICY "Admins can update commissions"
ON commissions FOR UPDATE TO authenticated
USING (
    company_id = get_my_company()
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'landlord')
    )
);

-- 6. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_commissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS commissions_updated_at ON commissions;
CREATE TRIGGER commissions_updated_at
    BEFORE UPDATE ON commissions
    FOR EACH ROW
    EXECUTE FUNCTION update_commissions_updated_at();

COMMIT;

-- =================================================================
-- EXECUTION COMPLETE:
-- 1. Commissions table created with proper schema
-- 2. Indexes added for performance
-- 3. RLS policies enforce company isolation and role-based access
-- =================================================================
