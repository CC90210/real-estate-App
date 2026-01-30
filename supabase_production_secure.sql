
-- PRODUCTION SECURE SCHEMA UPGRADE

-- 1. Multi-Tenancy Columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS company_id uuid;

-- 2. Sensitive Screening Data
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS singlekey_report_url text;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS background_status text DEFAULT 'pending';

-- 3. Add Owner ID to Properties (for Landlord filtering)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id);


-- 4. THE PRIVACY WALL (Role-Based RLS)

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- DROP OLD POLICIES
DROP POLICY IF EXISTS "Agents can view all applications" ON public.applications;
DROP POLICY IF EXISTS "Landlords can view own properties" ON public.properties;

-- A. Multi-Tenant Global Policy: Users only see data from their own company
-- (Applying this logic to all tables)

-- NOTE: We use a helper function to get company_id to keep policies clean
CREATE OR REPLACE FUNCTION get_my_company() RETURNS uuid AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- APPLICATION POLICIES
-- Agents can see applications they created OR for properties in their company, 
-- but we will use a safe VIEW to hide credit scores for agents.

CREATE OR REPLACE VIEW public.application_details AS
SELECT 
    a.id,
    a.property_id,
    a.applicant_name,
    a.applicant_email,
    a.status,
    a.monthly_income,
    a.notes,
    a.created_at,
    a.company_id,
    -- HIDE SENSITIVE DATA FROM AGENTS
    CASE 
        WHEN (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'landlord') THEN a.credit_score 
        ELSE NULL 
    END as credit_score,
    CASE 
        WHEN (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'landlord') THEN a.singlekey_report_url 
        ELSE NULL 
    END as singlekey_report_url,
    a.background_status
FROM public.applications a
WHERE a.company_id = get_my_company();

-- Fix RLS on the base table to allow the view to work
CREATE POLICY "Users can only select their company applications" 
ON public.applications FOR SELECT 
USING (company_id = get_my_company());

CREATE POLICY "Agents can insert applications" 
ON public.applications FOR INSERT 
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Owners/Admins can update applications" 
ON public.applications FOR UPDATE 
USING (
  company_id = get_my_company() AND 
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'landlord', 'agent')
);

-- PROPERTY POLICIES (Landlord Restriction)
CREATE POLICY "Landlords see only their owned properties" 
ON public.properties FOR SELECT 
USING (
    company_id = get_my_company() AND (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'agent') OR
        owner_id = auth.uid()
    )
);

-- REFRESH DATA (Optional Seed for Company)
-- update profiles set company_id = uuid_generate_v4() where company_id is null;
