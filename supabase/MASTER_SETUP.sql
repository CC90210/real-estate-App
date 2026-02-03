-- ==============================================================================
-- PROPFLOW MASTER DATABASE SETUP
-- Run this single script to set up everything
-- ==============================================================================

-- ================================================
-- SECTION 1: Core Helper Functions
-- ================================================

-- Get current user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT company_id 
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ================================================
-- SECTION 2: Ensure Companies Table Has All Columns
-- ================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'logo_url') THEN
        ALTER TABLE public.companies ADD COLUMN logo_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'address') THEN
        ALTER TABLE public.companies ADD COLUMN address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'phone') THEN
        ALTER TABLE public.companies ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'email') THEN
        ALTER TABLE public.companies ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'tagline') THEN
        ALTER TABLE public.companies ADD COLUMN tagline TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'updated_at') THEN
        ALTER TABLE public.companies ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- ================================================
-- SECTION 2B: Ensure Properties Table Has All Columns
-- ================================================

DO $$
BEGIN
    -- Essential property fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'deposit') THEN
        ALTER TABLE public.properties ADD COLUMN deposit NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'available_date') THEN
        ALTER TABLE public.properties ADD COLUMN available_date DATE DEFAULT CURRENT_DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'amenities') THEN
        ALTER TABLE public.properties ADD COLUMN amenities TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'lockbox_code') THEN
        ALTER TABLE public.properties ADD COLUMN lockbox_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'photos') THEN
        ALTER TABLE public.properties ADD COLUMN photos TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'description') THEN
        ALTER TABLE public.properties ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'updated_at') THEN
        ALTER TABLE public.properties ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- ================================================
-- SECTION 3: Enable RLS on All Tables
-- ================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- ================================================
-- SECTION 4: RLS Policies
-- ================================================

-- Profiles
DROP POLICY IF EXISTS "profiles_isolation" ON public.profiles;
CREATE POLICY "profiles_isolation" ON public.profiles
    FOR ALL TO authenticated
    USING (id = auth.uid() OR company_id = public.get_user_company_id())
    WITH CHECK (id = auth.uid() OR company_id = public.get_user_company_id());

-- Companies
DROP POLICY IF EXISTS "companies_isolation" ON public.companies;
CREATE POLICY "companies_isolation" ON public.companies
    FOR ALL TO authenticated
    USING (id = public.get_user_company_id())
    WITH CHECK (id = public.get_user_company_id());

-- Properties
DROP POLICY IF EXISTS "properties_isolation" ON public.properties;
CREATE POLICY "properties_isolation" ON public.properties
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- Applications
DROP POLICY IF EXISTS "applications_isolation" ON public.applications;
CREATE POLICY "applications_isolation" ON public.applications
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- Documents
DROP POLICY IF EXISTS "documents_isolation" ON public.documents;
CREATE POLICY "documents_isolation" ON public.documents
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- Invoices
DROP POLICY IF EXISTS "invoices_isolation" ON public.invoices;
CREATE POLICY "invoices_isolation" ON public.invoices
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- Showings
DROP POLICY IF EXISTS "showings_isolation" ON public.showings;
CREATE POLICY "showings_isolation" ON public.showings
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- Landlords
DROP POLICY IF EXISTS "landlords_isolation" ON public.landlords;
CREATE POLICY "landlords_isolation" ON public.landlords
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- Areas
DROP POLICY IF EXISTS "areas_isolation" ON public.areas;
CREATE POLICY "areas_isolation" ON public.areas
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- Buildings
DROP POLICY IF EXISTS "buildings_isolation" ON public.buildings;
CREATE POLICY "buildings_isolation" ON public.buildings
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- Activity Log (Team Activity)
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_log_isolation" ON public.activity_log;
CREATE POLICY "activity_log_isolation" ON public.activity_log
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- ================================================
-- SECTION 5: Fix Orphan Profiles (Auto-Create Companies)
-- ================================================

-- Find profiles with null company_id and create companies for them
DO $$
DECLARE
    orphan RECORD;
    new_company_id UUID;
BEGIN
    FOR orphan IN 
        SELECT id, email, full_name 
        FROM public.profiles 
        WHERE company_id IS NULL
    LOOP
        -- Create a company for this profile
        INSERT INTO public.companies (name, created_at)
        VALUES (
            COALESCE(orphan.full_name, SPLIT_PART(orphan.email, '@', 1)) || '''s Company',
            NOW()
        )
        RETURNING id INTO new_company_id;

        -- Link the profile to the new company
        UPDATE public.profiles
        SET company_id = new_company_id, updated_at = NOW()
        WHERE id = orphan.id;

        RAISE NOTICE 'Created company for profile %', orphan.email;
    END LOOP;
END $$;

-- ================================================
-- SECTION 6: Trigger for Future Profiles
-- ================================================

CREATE OR REPLACE FUNCTION public.ensure_profile_has_company()
RETURNS TRIGGER AS $$
DECLARE
    new_company_id UUID;
BEGIN
    IF NEW.company_id IS NULL THEN
        INSERT INTO public.companies (name, created_at)
        VALUES (
            COALESCE(NEW.full_name, SPLIT_PART(NEW.email, '@', 1)) || '''s Company',
            NOW()
        )
        RETURNING id INTO new_company_id;
        
        NEW.company_id := new_company_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_ensure_company ON public.profiles;
CREATE TRIGGER trigger_ensure_company
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_profile_has_company();

-- ================================================
-- SECTION 7: Grant Permissions
-- ================================================

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.companies TO authenticated;
GRANT ALL ON public.properties TO authenticated;
GRANT ALL ON public.applications TO authenticated;
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.showings TO authenticated;
GRANT ALL ON public.landlords TO authenticated;
GRANT ALL ON public.areas TO authenticated;
GRANT ALL ON public.buildings TO authenticated;
GRANT ALL ON public.activity_log TO authenticated;

-- ================================================
-- FINAL: Reload Schema Cache
-- ================================================

NOTIFY pgrst, 'reload schema';

-- Verification
SELECT 'Setup Complete' AS status;
