-- ==============================================================================
-- FINAL APPLICATIONS MODEL FIX: Ensure all required columns and constraints
-- ==============================================================================

-- 1. Ensure Table and Core Columns
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add Missing Columns (Idempotent)
DO $$ 
BEGIN
    -- Relationships
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='property_id') THEN
        ALTER TABLE public.applications ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='company_id') THEN
        ALTER TABLE public.applications ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='created_by') THEN
        ALTER TABLE public.applications ADD COLUMN created_by UUID REFERENCES public.profiles(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='agent_id') THEN
        ALTER TABLE public.applications ADD COLUMN agent_id UUID REFERENCES public.profiles(id);
    END IF;

    -- Applicant Identity
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='applicant_name') THEN
        ALTER TABLE public.applications ADD COLUMN applicant_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='applicant_email') THEN
        ALTER TABLE public.applications ADD COLUMN applicant_email TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='applicant_phone') THEN
        ALTER TABLE public.applications ADD COLUMN applicant_phone TEXT;
    END IF;

    -- Employment & Income
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='monthly_income') THEN
        ALTER TABLE public.applications ADD COLUMN monthly_income NUMERIC(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='credit_score') THEN
        ALTER TABLE public.applications ADD COLUMN credit_score INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='employer') THEN
        ALTER TABLE public.applications ADD COLUMN employer TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='employment_status') THEN
        ALTER TABLE public.applications ADD COLUMN employment_status TEXT;
    END IF;

    -- Application Details
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='current_address') THEN
        ALTER TABLE public.applications ADD COLUMN current_address TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='move_in_date') THEN
        ALTER TABLE public.applications ADD COLUMN move_in_date TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='num_occupants') THEN
        ALTER TABLE public.applications ADD COLUMN num_occupants INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='has_pets') THEN
        ALTER TABLE public.applications ADD COLUMN has_pets BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='pet_details') THEN
        ALTER TABLE public.applications ADD COLUMN pet_details TEXT;
    END IF;

    -- Workflow & Status
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='status') THEN
        ALTER TABLE public.applications ADD COLUMN status TEXT DEFAULT 'new';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='notes') THEN
        ALTER TABLE public.applications ADD COLUMN notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='additional_notes') THEN
        ALTER TABLE public.applications ADD COLUMN additional_notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='applications' AND COLUMN_NAME='updated_at') THEN
        ALTER TABLE public.applications ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

END $$;

-- 3. Relax Constraints (Avoid "NOT NULL" failures for optional fields while allowing app to enforce requirements)
-- We only keep Name and Email as strictly required at DB level if necessary, but actually for internal apps, 
-- we can let the frontend handle validation and keep DB semi-permeable for flexibility.
-- However, if the user wants it robust, we should ensure at least the core identity is there.

ALTER TABLE public.applications ALTER COLUMN applicant_name SET NOT NULL;
ALTER TABLE public.applications ALTER COLUMN applicant_email SET NOT NULL;
-- Fix the phone number constraint if it was causing issues - make sure it is TEXT NOT NULL if we want it required
ALTER TABLE public.applications ALTER COLUMN applicant_phone SET NOT NULL;

-- 4. Ensure RLS is correctly applied for Multi-Tenancy
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage applications for their company" ON public.applications;
CREATE POLICY "Users can manage applications for their company" ON public.applications
    FOR ALL TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- 5. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
