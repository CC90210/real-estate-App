-- ==============================================================================
-- FIX SETTINGS SCHEMA & PROFILES
-- Run this script in the Supabase SQL Editor to fix "Failed to save profile" errors.
-- ==============================================================================

-- 1. Ensure PROFILES table has all required columns
DO $$
BEGIN
    -- 'updated_at' is critical for the settings page
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- 'phone'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    END IF;

    -- 'full_name'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;

    -- 'company_id' (Foreign Key)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_id') THEN
        ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id);
    END IF;

    -- 'branding' (JSONB for accent color, theme)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'branding') THEN
        ALTER TABLE public.profiles ADD COLUMN branding JSONB DEFAULT '{"accent": "blue", "theme": "light"}';
    END IF;

    -- 'preferences' (JSONB for notifications)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferences') THEN
        ALTER TABLE public.profiles ADD COLUMN preferences JSONB DEFAULT '{"notifications": {"email": true, "push": true}, "alerts": {"new_app": true, "ai_doc": true, "revenue": false}}';
    END IF;
END $$;

-- 2. Ensure COMPANIES table has all required columns (for Branding & UI tab)
DO $$
BEGIN
    -- 'updated_at'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'updated_at') THEN
        ALTER TABLE public.companies ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- 'logo_url'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'logo_url') THEN
        ALTER TABLE public.companies ADD COLUMN logo_url TEXT;
    END IF;

    -- 'address'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'address') THEN
        ALTER TABLE public.companies ADD COLUMN address TEXT;
    END IF;

    -- 'phone'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'phone') THEN
        ALTER TABLE public.companies ADD COLUMN phone TEXT;
    END IF;

    -- 'email'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'email') THEN
        ALTER TABLE public.companies ADD COLUMN email TEXT;
    END IF;

    -- 'tagline'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'tagline') THEN
        ALTER TABLE public.companies ADD COLUMN tagline TEXT;
    END IF;
END $$;

-- 3. Update Permissions / Policies (Just to be safe)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.companies TO authenticated;

-- 4. Reload the Schema Cache
-- This is often the cause of "Could not find column in schema cache" errors
NOTIFY pgrst, 'reload schema';

SELECT 'Schema Fixed and Reloaded Successfully' as status;
