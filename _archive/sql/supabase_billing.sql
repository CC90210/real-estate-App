-- Add plan column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS plan TEXT CHECK (plan IN ('essentials', 'professional', 'enterprise')) DEFAULT 'essentials';

-- Add subscription_status column
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';

-- Add subscription_id for Stripe integration
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
