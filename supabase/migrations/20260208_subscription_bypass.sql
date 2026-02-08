-- ==============================================================================
-- SUBSCRIPTION BYPASS & LIFETIME ACCESS
-- ==============================================================================

-- 1. Add Support for Lifetime Access and Manual Feature Overrides
-- These columns allow admins (you) to grant full access regardless of Stripe status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'is_lifetime_access') THEN
        ALTER TABLE public.companies 
        ADD COLUMN is_lifetime_access BOOLEAN DEFAULT FALSE;
    END IF;

    -- Ensure subscription_plan exists (it was missing in some previous thoughts)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'subscription_plan') THEN
        ALTER TABLE public.companies 
        ADD COLUMN subscription_plan TEXT;
    END IF;
END $$;

-- 2. Create a "Full Access" function check for RLS and logical guards
-- This makes it easy for the app to know if any restriction should be ignored
CREATE OR REPLACE FUNCTION public.is_company_unrestricted(check_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_unrestricted BOOLEAN;
BEGIN
    SELECT 
        (subscription_status = 'active' OR is_lifetime_access = TRUE)
    INTO is_unrestricted
    FROM public.companies
    WHERE id = check_company_id;
    
    RETURN COALESCE(is_unrestricted, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. GRANDFATHERING: Ensure current testing user has access
-- This unblocks the user immediately upon migration execution
UPDATE public.companies 
SET 
    subscription_plan = 'enterprise',
    subscription_status = 'active',
    is_lifetime_access = TRUE,
    automation_enabled = TRUE
WHERE subscription_plan IS NULL OR subscription_tier = 'enterprise';

-- 4. Sync subscription_tier and subscription_plan if they diverge
UPDATE public.companies SET subscription_plan = 'essentials' WHERE subscription_tier = 'tier_1' AND subscription_plan IS NULL;
UPDATE public.companies SET subscription_plan = 'professional' WHERE subscription_tier = 'tier_2' AND subscription_plan IS NULL;
UPDATE public.companies SET subscription_plan = 'enterprise' WHERE subscription_tier = 'tier_3' AND subscription_plan IS NULL;
