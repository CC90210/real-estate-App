-- ==============================================================================
-- ROBUST DATABASE RECONSTRUCTION: MULTI-TENANCY & RLS SECURITY (V3)
-- FIX: Moved helper function from 'auth' to 'public' schema to avoid permission errors.
-- ==============================================================================

-- 1. Ensure Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure Core Tables Exist (Self-Healing Schema)
CREATE TABLE IF NOT EXISTS public.areas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.properties (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    rent NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.property_photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add Company ID to all tables (Safe execution)
DO $$ 
BEGIN
    -- Areas
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='areas' AND COLUMN_NAME='company_id') THEN
        ALTER TABLE public.areas ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
    -- Buildings
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='buildings' AND COLUMN_NAME='company_id') THEN
        ALTER TABLE public.buildings ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
    -- Properties
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='properties' AND COLUMN_NAME='company_id') THEN
        ALTER TABLE public.properties ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
    -- Photos
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='property_photos' AND COLUMN_NAME='company_id') THEN
        ALTER TABLE public.property_photos ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. HELPER FUNCTION TO GET SESSION COMPANY_ID
-- FIX: Using 'public' schema instead of 'auth' to avoid permission issues.
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5. ENABLE RLS (Safe execution)
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;

-- 6. REBUILD POLICIES (Idempotent)
DROP POLICY IF EXISTS "Users can manage areas for their company" ON public.areas;
CREATE POLICY "Users can manage areas for their company" ON public.areas
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Users can manage buildings for their company" ON public.buildings;
CREATE POLICY "Users can manage buildings for their company" ON public.buildings
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Users can manage properties for their company" ON public.properties;
CREATE POLICY "Users can manage properties for their company" ON public.properties
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Users can manage photos for their company" ON public.property_photos;
CREATE POLICY "Users can manage photos for their company" ON public.property_photos
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- 7. STORAGE SETUP
INSERT INTO storage.buckets (id, name, public) 
VALUES ('properties', 'properties', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'properties');

DROP POLICY IF EXISTS "Allow public view" ON storage.objects;
CREATE POLICY "Allow public view" ON storage.objects
    FOR SELECT TO authenticated, anon
    USING (bucket_id = 'properties');

NOTIFY pgrst, 'reload schema';
SELECT 'ROBUST DATABASE FIX V3 APPLIED SUCCESSFULLY' as status;
