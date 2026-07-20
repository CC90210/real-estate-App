-- ==============================================================================
-- PROPFLOW PRICING TIERS & AUTOMATION FLAGS
-- ==============================================================================

-- 1. Add Subscription Tier Column to Companies
-- Default to 'tier_1' (Essentials) to ensure backward compatibility without breaking existing users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'subscription_tier') THEN
        ALTER TABLE public.companies 
        ADD COLUMN subscription_tier TEXT DEFAULT 'tier_1';
        
        -- Add check constraint for valid tiers
        -- tier_1: Essentials (CRM)
        -- tier_2: Professional (Docs)
        -- tier_3: Business Elite (Invoices, Showings)
        -- enterprise: All Access + Priority
        ALTER TABLE public.companies 
        ADD CONSTRAINT check_subscription_tier 
        CHECK (subscription_tier IN ('tier_1', 'tier_2', 'tier_3', 'enterprise'));
    END IF;
END $$;

-- 2. Add Automation Upsell Flag
-- This controls access to the N8N workflows and advanced integrations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'automation_enabled') THEN
        ALTER TABLE public.companies 
        ADD COLUMN automation_enabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 3. Add Feature Flags Column (JSONB) for Granular Control
-- Allows enabling specific features per company outside of strict tiers if needed (e.g. beta access)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'feature_flags') THEN
        ALTER TABLE public.companies 
        ADD COLUMN feature_flags JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 4. Update Existing Companies to 'tier_3' (Grandfathering Strategy)
-- OR 'enterprise' if you want existing users to have everything. 
-- User said: "we're only doing enterprise deals, but we do plan on incorporating like a monthly structure."
-- So existing companies likely should be 'enterprise' or at least 'tier_3'.
-- Let's set existing companies to 'enterprise' to avoid disruption during rollout.
UPDATE public.companies 
SET subscription_tier = 'enterprise', automation_enabled = TRUE 
WHERE subscription_tier = 'tier_1'; 
-- Logic: The default was tier_1, so any row just created or existing with default is now upgraded.

-- Verification
SELECT id, name, subscription_tier, automation_enabled FROM public.companies LIMIT 5;
