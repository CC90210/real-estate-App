-- ==============================================================================
-- ENSURE COMPANIES TABLE HAS ALL BRANDING COLUMNS
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- Add missing columns to companies table
DO $$
BEGIN
    -- Check and add logo_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'logo_url') THEN
        ALTER TABLE public.companies ADD COLUMN logo_url TEXT;
        RAISE NOTICE 'Added logo_url to companies';
    END IF;

    -- Check and add address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'address') THEN
        ALTER TABLE public.companies ADD COLUMN address TEXT;
        RAISE NOTICE 'Added address to companies';
    END IF;

    -- Check and add phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'phone') THEN
        ALTER TABLE public.companies ADD COLUMN phone TEXT;
        RAISE NOTICE 'Added phone to companies';
    END IF;

    -- Check and add email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'email') THEN
        ALTER TABLE public.companies ADD COLUMN email TEXT;
        RAISE NOTICE 'Added email to companies';
    END IF;

    -- Check and add tagline
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'tagline') THEN
        ALTER TABLE public.companies ADD COLUMN tagline TEXT;
        RAISE NOTICE 'Added tagline to companies';
    END IF;

    -- Check and add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'updated_at') THEN
        ALTER TABLE public.companies ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at to companies';
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy
DROP POLICY IF EXISTS "Users can view and update own company" ON public.companies;
CREATE POLICY "Users can view and update own company" ON public.companies
    FOR ALL TO authenticated
    USING (id = public.get_user_company_id())
    WITH CHECK (id = public.get_user_company_id());

-- Grant permissions
GRANT ALL ON public.companies TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Verification: Show current companies schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND table_schema = 'public'
ORDER BY ordinal_position;
