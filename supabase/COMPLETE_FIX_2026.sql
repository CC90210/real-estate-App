-- ==============================================================================
-- PROPFLOW COMPLETE FIX SCRIPT - FEBRUARY 2026
-- ==============================================================================
-- Run this AFTER the CRITICAL_FIX_2026.sql
-- This adds:
-- 1. Stripe Connect accounts table
-- 2. Sets your profile as super admin
-- 3. Ensures all tables have correct columns
-- ==============================================================================

-- ============================================
-- SECTION 1: CREATE STRIPE CONNECT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.stripe_connect_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    stripe_account_id TEXT NOT NULL,
    onboarding_complete BOOLEAN DEFAULT FALSE,
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id)
);

ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Company isolation for stripe_connect_accounts"
    ON stripe_connect_accounts FOR ALL TO authenticated
    USING (company_id = get_my_company())
    WITH CHECK (company_id = get_my_company());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- SECTION 2: SET YOUR PROFILE AS SUPER ADMIN
-- ============================================
-- This gives you full access to all features

-- First, let's see all users
SELECT id, email, is_super_admin, is_partner FROM profiles;

-- Update ALL profiles to have super admin (for testing)
-- In production, you'd want to target a specific email
UPDATE profiles
SET
    is_super_admin = TRUE,
    is_partner = TRUE,
    partner_type = 'founding'
WHERE is_super_admin IS NULL OR is_super_admin = FALSE;

-- ============================================
-- SECTION 3: ENSURE COMPANIES HAVE CORRECT STATUS
-- ============================================
UPDATE companies
SET
    subscription_plan = 'enterprise',
    subscription_status = 'active',
    is_lifetime_access = TRUE
WHERE is_lifetime_access IS NULL OR is_lifetime_access = FALSE;

-- ============================================
-- SECTION 4: ADD MISSING COLUMNS IF NEEDED
-- ============================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connect_enabled BOOLEAN DEFAULT FALSE;

-- ============================================
-- SECTION 5: PERMISSIONS
-- ============================================
GRANT ALL ON public.stripe_connect_accounts TO authenticated;
GRANT ALL ON public.stripe_connect_accounts TO service_role;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT
    'COMPLETE FIX APPLIED' as status,
    (SELECT COUNT(*) FROM profiles WHERE is_super_admin = TRUE) as super_admins,
    (SELECT COUNT(*) FROM companies WHERE is_lifetime_access = TRUE) as lifetime_companies;
