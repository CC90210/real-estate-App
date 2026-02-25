-- ============================================================
-- MIGRATION 1: Ensure companies table has all required columns
-- ============================================================
-- Subscription tracking columns
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'none';
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
-- Plan override for enterprise deals (bypasses Stripe)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS plan_override TEXT;
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS plan_override_reason TEXT;
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS plan_override_by UUID REFERENCES profiles(id);
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS plan_override_at TIMESTAMPTZ;
-- Late API (social media)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS late_profile_id TEXT;
-- Usage tracking (denormalized counters for fast reads)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS property_count INTEGER DEFAULT 0;
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS team_member_count INTEGER DEFAULT 1;
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS social_account_count INTEGER DEFAULT 0;
-- Metadata
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
-- Remove old column names if they exist (from previous iterations)
-- These are safe to run even if columns don't exist
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'companies'
        AND column_name = 'subscription_tier'
) THEN -- Migrate data from old column to new column
UPDATE companies
SET subscription_plan = subscription_tier
WHERE subscription_plan = 'none'
    AND subscription_tier IS NOT NULL;
END IF;
END $$;
-- ============================================================
-- MIGRATION 2: Ensure profiles table has all required columns
-- ============================================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
-- Ensure the role check constraint exists (ignore error if already exists)
DO $$ BEGIN
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check CHECK (
        role IN ('super_admin', 'admin', 'agent', 'landlord')
    );
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
-- ============================================================
-- MIGRATION 3: Platform-level invitations (NOT team invitations)
-- These are created by super_admin to onboard new companies
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Invitation details
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    label TEXT NOT NULL,
    -- Internal label (e.g., "Enterprise deal - ABC Realty")
    -- What the invitee gets
    company_name TEXT,
    -- Pre-filled company name (optional, user can change)
    assigned_plan TEXT NOT NULL DEFAULT 'agent_pro',
    -- Plan to assign: agent_pro, agency_growth, brokerage_command, enterprise
    is_enterprise BOOLEAN DEFAULT false,
    -- If true, bypasses Stripe and gets unlimited access
    -- Tracking
    created_by UUID NOT NULL REFERENCES profiles(id),
    status TEXT DEFAULT 'active' CHECK (
        status IN ('active', 'used', 'revoked', 'expired')
    ),
    -- Usage
    used_by UUID REFERENCES profiles(id),
    used_at TIMESTAMPTZ,
    company_created_id UUID REFERENCES companies(id),
    -- The company that was created when used
    -- Limits
    max_uses INTEGER DEFAULT 1,
    use_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_invitations_token ON platform_invitations(token);
CREATE INDEX IF NOT EXISTS idx_platform_invitations_status ON platform_invitations(status);
CREATE INDEX IF NOT EXISTS idx_platform_invitations_created_by ON platform_invitations(created_by);
-- RLS
ALTER TABLE platform_invitations ENABLE ROW LEVEL SECURITY;
-- Only super_admin can manage platform invitations
DROP POLICY IF EXISTS "super_admin_manage_platform_invitations" ON platform_invitations;
CREATE POLICY "super_admin_manage_platform_invitations" ON platform_invitations FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = auth.uid()
            AND role = 'super_admin'
    )
);
-- Anyone can read by token (for the signup flow)
DROP POLICY IF EXISTS "read_platform_invitation_by_token" ON platform_invitations;
CREATE POLICY "read_platform_invitation_by_token" ON platform_invitations FOR
SELECT TO anon,
    authenticated USING (true);
-- Token lookup is filtered in the query itself
-- ============================================================
-- MIGRATION 4: Materialized view for platform metrics
-- Fast reads for the admin dashboard without querying every table
-- ============================================================
-- Helper function to check enterprise override
CREATE OR REPLACE FUNCTION is_enterprise_override(company_uuid UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
SELECT COALESCE(plan_override = 'enterprise', false)
FROM companies
WHERE id = company_uuid;
$$;
-- Function to get platform-wide stats
CREATE OR REPLACE FUNCTION get_platform_metrics() RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE result JSON;
BEGIN -- Only super_admin can call this
IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
        AND role = 'super_admin'
) THEN RETURN '{"error": "unauthorized"}'::JSON;
END IF;
SELECT json_build_object(
        'total_companies',
        (
            SELECT count(*)
            FROM companies
        ),
        'total_users',
        (
            SELECT count(*)
            FROM profiles
            WHERE is_active = true
        ),
        'total_properties',
        (
            SELECT count(*)
            FROM properties
        ),
        'total_applications',
        (
            SELECT count(*)
            FROM applications
        ),
        -- Subscription breakdown
        'subscriptions',
        json_build_object(
            'active',
            (
                SELECT count(*)
                FROM companies
                WHERE subscription_status = 'active'
            ),
            'trialing',
            (
                SELECT count(*)
                FROM companies
                WHERE subscription_status = 'trialing'
                    OR subscription_status = 'trial'
            ),
            'enterprise',
            (
                SELECT count(*)
                FROM companies
                WHERE plan_override = 'enterprise'
                    OR is_enterprise_override(id)
            ),
            'cancelled',
            (
                SELECT count(*)
                FROM companies
                WHERE subscription_status = 'cancelled'
            ),
            'none',
            (
                SELECT count(*)
                FROM companies
                WHERE subscription_status = 'none'
                    OR subscription_status IS NULL
            )
        ),
        -- Plan distribution
        'plans',
        json_build_object(
            'agent_pro',
            (
                SELECT count(*)
                FROM companies
                WHERE COALESCE(plan_override, subscription_plan) = 'agent_pro'
            ),
            'agency_growth',
            (
                SELECT count(*)
                FROM companies
                WHERE COALESCE(plan_override, subscription_plan) = 'agency_growth'
            ),
            'brokerage_command',
            (
                SELECT count(*)
                FROM companies
                WHERE COALESCE(plan_override, subscription_plan) = 'brokerage_command'
            ),
            'enterprise',
            (
                SELECT count(*)
                FROM companies
                WHERE plan_override = 'enterprise'
            )
        ),
        -- Recent activity (last 30 days)
        'recent',
        json_build_object(
            'new_companies_30d',
            (
                SELECT count(*)
                FROM companies
                WHERE created_at > now() - INTERVAL '30 days'
            ),
            'new_users_30d',
            (
                SELECT count(*)
                FROM profiles
                WHERE created_at > now() - INTERVAL '30 days'
            )
        ),
        -- Revenue (from Stripe, tracked locally)
        'mrr_estimate',
        (
            SELECT COALESCE(
                    SUM(
                        CASE
                            COALESCE(plan_override, subscription_plan)
                            WHEN 'agent_pro' THEN 149
                            WHEN 'agency_growth' THEN 289
                            WHEN 'brokerage_command' THEN 499
                            ELSE 0
                        END
                    ),
                    0
                )
            FROM companies
            WHERE subscription_status = 'active'
        )
    ) INTO result;
RETURN result;
END;
$$;
-- ============================================================
-- MIGRATION 5: Auto-update usage counters on companies table
-- These triggers keep property_count, team_member_count, and
-- social_account_count in sync without manual updates
-- ============================================================
-- Property counter
CREATE OR REPLACE FUNCTION update_property_count() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF TG_OP = 'INSERT' THEN
UPDATE companies
SET property_count = property_count + 1,
    updated_at = now()
WHERE id = NEW.company_id;
ELSIF TG_OP = 'DELETE' THEN
UPDATE companies
SET property_count = GREATEST(property_count - 1, 0),
    updated_at = now()
WHERE id = OLD.company_id;
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_property_count ON properties;
CREATE TRIGGER trg_property_count
AFTER
INSERT
    OR DELETE ON properties FOR EACH ROW EXECUTE FUNCTION update_property_count();
-- Team member counter
CREATE OR REPLACE FUNCTION update_team_member_count() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF TG_OP = 'INSERT' THEN
UPDATE companies
SET team_member_count = team_member_count + 1,
    updated_at = now()
WHERE id = NEW.company_id;
ELSIF TG_OP = 'DELETE' THEN
UPDATE companies
SET team_member_count = GREATEST(team_member_count - 1, 0),
    updated_at = now()
WHERE id = OLD.company_id;
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_team_member_count ON profiles;
CREATE TRIGGER trg_team_member_count
AFTER
INSERT
    OR DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION update_team_member_count();
-- Social account counter
CREATE OR REPLACE FUNCTION update_social_account_count() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF TG_OP = 'INSERT' THEN
UPDATE companies
SET social_account_count = social_account_count + 1,
    updated_at = now()
WHERE id = NEW.company_id;
ELSIF TG_OP = 'DELETE' THEN
UPDATE companies
SET social_account_count = GREATEST(social_account_count - 1, 0),
    updated_at = now()
WHERE id = OLD.company_id;
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;
-- Only create this trigger if social_accounts table exists
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'social_accounts'
) THEN DROP TRIGGER IF EXISTS trg_social_account_count ON social_accounts;
CREATE TRIGGER trg_social_account_count
AFTER
INSERT
    OR DELETE ON social_accounts FOR EACH ROW EXECUTE FUNCTION update_social_account_count();
END IF;
END $$;
-- BACKFILL existing counts
UPDATE companies c
SET property_count = COALESCE(
        (
            SELECT count(*)
            FROM properties
            WHERE company_id = c.id
        ),
        0
    ),
    team_member_count = COALESCE(
        (
            SELECT count(*)
            FROM profiles
            WHERE company_id = c.id
        ),
        0
    ),
    social_account_count = COALESCE(
        (
            SELECT count(*)
            FROM (
                    SELECT *
                    FROM information_schema.tables
                    WHERE table_name = 'social_accounts'
                ) sa,
                (
                    SELECT 1
                ) _
            WHERE EXISTS (
                    SELECT 1
                    FROM social_accounts
                    WHERE company_id = c.id
                )
        ),
        0
    );
-- ============================================================
-- MIGRATION 6: Ensure get_my_company_id() Function Exists
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_company_id() RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
SELECT company_id
FROM profiles
WHERE id = auth.uid() $$;
-- Alias for compatibility (some policies use get_my_company)
CREATE OR REPLACE FUNCTION get_my_company() RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
SELECT company_id
FROM profiles
WHERE id = auth.uid() $$;
-- ============================================================
-- SUPER ADMIN OVERRIDE
-- Use this query manually after updating to your actual email
-- ============================================================
-- UPDATE profiles SET role = 'super_admin' WHERE email = 'YOUR-REAL-EMAIL-HERE';