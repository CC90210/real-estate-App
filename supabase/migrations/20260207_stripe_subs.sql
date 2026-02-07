-- ==============================================================================
-- STRIPE INTEGRATION MIGRATION
-- ==============================================================================

-- 1. Add Subscription Tracking Columns to Companies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'subscription_status') THEN
        ALTER TABLE public.companies 
        ADD COLUMN subscription_status TEXT DEFAULT 'trialing'; -- trialing, active, past_due, canceled, unpaid
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'stripe_subscription_id') THEN
        ALTER TABLE public.companies 
        ADD COLUMN stripe_subscription_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'subscription_current_period_end') THEN
        ALTER TABLE public.companies 
        ADD COLUMN subscription_current_period_end TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Add Stripe Customer ID to Profiles
-- This links a specific user (usually the admin who signed up) to the Stripe Customer
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE public.profiles 
        ADD COLUMN stripe_customer_id TEXT;
        
        -- Create index for faster lookups during webhooks
        CREATE INDEX idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
    END IF;
END $$;
