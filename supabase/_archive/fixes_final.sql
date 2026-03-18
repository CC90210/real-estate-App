-- 1. Enable UUID extension if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure Companies and Profiles setup (from crisis fix)
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  logo_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS automation_webhook_id uuid DEFAULT uuid_generate_v4() UNIQUE;

-- 3. Add company_id to existing tables
ALTER TABLE public.areas 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

ALTER TABLE public.buildings 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS landlord_id uuid REFERENCES public.profiles(id); -- Ensure landlord link

ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

ALTER TABLE public.activity_log 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 4. Create Missing Tables (Documents, Showings, Commissions)

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT CHECK (type IN ('property_summary', 'lease_proposal', 'showing_sheet', 'application_summary')),
  title TEXT NOT NULL,
  content JSONB,
  pdf_url TEXT,
  
  property_id UUID REFERENCES public.properties(id),
  application_id UUID REFERENCES public.applications(id),
  company_id UUID REFERENCES public.companies(id),
  created_by UUID REFERENCES public.profiles(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SHOWINGS
CREATE TABLE IF NOT EXISTS public.showings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id),
  agent_id UUID REFERENCES public.profiles(id),
  company_id UUID REFERENCES public.companies(id),
  
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',
  
  notes TEXT,
  feedback TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COMMISSIONS
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agent_id UUID REFERENCES public.profiles(id),
  property_id UUID REFERENCES public.properties(id),
  application_id UUID REFERENCES public.applications(id),
  company_id UUID REFERENCES public.companies(id),
  
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'paid')) DEFAULT 'pending',
  description TEXT,
  earned_date DATE DEFAULT CURRENT_DATE,
  paid_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS on new Tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (Tenant Isolation)

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Generic Company Policy Generator (optional, but manually writing is safer for clarity)

-- DOCUMENTS Policies
CREATE POLICY "Documents accessible by company members" ON public.documents
FOR ALL USING (company_id = get_my_company_id());

-- SHOWINGS Policies
CREATE POLICY "Showings accessible by company members" ON public.showings
FOR ALL USING (company_id = get_my_company_id());

-- COMMISSIONS Policies
CREATE POLICY "Commissions visible to own agent or admin" ON public.commissions
FOR SELECT USING (
  company_id = get_my_company_id() 
  AND (agent_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'landlord')))
);

CREATE POLICY "Commissions insertable by admin/system" ON public.commissions
FOR INSERT WITH CHECK (
  company_id = get_my_company_id()
  -- typically automated or admin only, for now allow company members
);

-- UPDATE EXISTING TABLES POLICIES TO USE COMPANY_ID

-- Properties
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;
CREATE POLICY "Properties viewable by company" ON public.properties
FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Properties insertable by company" ON public.properties
FOR INSERT WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Properties editable by company" ON public.properties
FOR UPDATE USING (company_id = get_my_company_id());

CREATE POLICY "Properties deletable by company" ON public.properties
FOR DELETE USING (company_id = get_my_company_id());

-- Applications
DROP POLICY IF EXISTS "Agents see own applications" ON public.applications;
DROP POLICY IF EXISTS "Admins/Landlords see all applications" ON public.applications;
DROP POLICY IF EXISTS "Agents can insert applications" ON public.applications;
DROP POLICY IF EXISTS "Admins/Landlords can update applications" ON public.applications;

CREATE POLICY "Applications viewable by company" ON public.applications
FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Applications insertable by company" ON public.applications
FOR INSERT WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Applications editable by company" ON public.applications
FOR UPDATE USING (company_id = get_my_company_id());

-- Activity Log
DROP POLICY IF EXISTS "Users can insert own logs" ON public.activity_log; -- if exists
CREATE POLICY "Activity Log viewable by company" ON public.activity_log
FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Activity Log insertable by company" ON public.activity_log
FOR INSERT WITH CHECK (company_id = get_my_company_id());

-- Areas
DROP POLICY IF EXISTS "Areas are viewable by everyone" ON public.areas;
CREATE POLICY "Areas viewable by company" ON public.areas
FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Areas insertable by company" ON public.areas
FOR INSERT WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Areas editable by company" ON public.areas
FOR UPDATE USING (company_id = get_my_company_id());

CREATE POLICY "Areas deletable by company" ON public.areas
FOR DELETE USING (company_id = get_my_company_id());

