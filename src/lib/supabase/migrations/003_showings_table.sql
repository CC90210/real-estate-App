-- =================================================================
-- SHOWINGS TABLE MIGRATION
-- =================================================================
-- Creates a showings table for tracking property showings
-- with proper RLS policies for multi-tenant security.
-- =================================================================

BEGIN;

-- 1. Create showings table
CREATE TABLE IF NOT EXISTS public.showings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    company_id UUID NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',
    notes TEXT,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_showings_company_id ON showings(company_id);
CREATE INDEX IF NOT EXISTS idx_showings_property_id ON showings(property_id);
CREATE INDEX IF NOT EXISTS idx_showings_agent_id ON showings(agent_id);
CREATE INDEX IF NOT EXISTS idx_showings_scheduled_date ON showings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_showings_status ON showings(status);

-- 3. Enable RLS
ALTER TABLE showings ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any
DROP POLICY IF EXISTS "Company users can view showings" ON showings;
DROP POLICY IF EXISTS "Company users can insert showings" ON showings;
DROP POLICY IF EXISTS "Company users can update showings" ON showings;
DROP POLICY IF EXISTS "Company users can delete showings" ON showings;

-- 5. Create secure RLS policies
CREATE POLICY "Company users can view showings"
ON showings FOR SELECT TO authenticated
USING (company_id = get_my_company());

CREATE POLICY "Company users can insert showings"
ON showings FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can update showings"
ON showings FOR UPDATE TO authenticated
USING (company_id = get_my_company())
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can delete showings"
ON showings FOR DELETE TO authenticated
USING (company_id = get_my_company());

-- 6. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_showings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS showings_updated_at ON showings;
CREATE TRIGGER showings_updated_at
    BEFORE UPDATE ON showings
    FOR EACH ROW
    EXECUTE FUNCTION update_showings_updated_at();

COMMIT;

-- =================================================================
-- EXECUTION COMPLETE:
-- 1. Showings table created with proper schema
-- 2. Indexes added for performance
-- 3. RLS policies enforce company isolation
-- =================================================================
