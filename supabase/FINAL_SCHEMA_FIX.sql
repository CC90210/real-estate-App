-- ==============================================================================
-- FINAL SCHEMA FIX: DOCUMENTS & INVOICES TABLES
-- This script ensures ALL required columns exist
-- ==============================================================================

-- 1. DOCUMENTS TABLE - Add all potentially missing columns
DO $$
BEGIN
    -- Check and add company_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'company_id') THEN
        ALTER TABLE public.documents ADD COLUMN company_id UUID;
        RAISE NOTICE 'Added company_id to documents';
    END IF;

    -- Check and add created_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'created_by') THEN
        ALTER TABLE public.documents ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added created_by to documents';
    END IF;

    -- Check and add type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'type') THEN
        ALTER TABLE public.documents ADD COLUMN type TEXT;
        RAISE NOTICE 'Added type to documents';
    END IF;

    -- Check and add title
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'title') THEN
        ALTER TABLE public.documents ADD COLUMN title TEXT;
        RAISE NOTICE 'Added title to documents';
    END IF;

    -- Check and add content (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'content') THEN
        ALTER TABLE public.documents ADD COLUMN content JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added content to documents';
    END IF;

    -- Check and add pdf_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'pdf_url') THEN
        ALTER TABLE public.documents ADD COLUMN pdf_url TEXT;
        RAISE NOTICE 'Added pdf_url to documents';
    END IF;

    -- Check and add property_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'property_id') THEN
        ALTER TABLE public.documents ADD COLUMN property_id UUID;
        RAISE NOTICE 'Added property_id to documents';
    END IF;

    -- Check and add APPLICATION_ID (the missing one!)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'application_id') THEN
        ALTER TABLE public.documents ADD COLUMN application_id UUID;
        RAISE NOTICE 'Added application_id to documents';
    END IF;

    -- Check and add status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'status') THEN
        ALTER TABLE public.documents ADD COLUMN status TEXT DEFAULT 'completed';
        RAISE NOTICE 'Added status to documents';
    END IF;

    -- Check and add created_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'created_at') THEN
        ALTER TABLE public.documents ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at to documents';
    END IF;

    -- Check and add updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'updated_at') THEN
        ALTER TABLE public.documents ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at to documents';
    END IF;
END $$;

-- 2. INVOICES TABLE - Add all potentially missing columns
DO $$
BEGIN
    -- Check and add company_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'company_id') THEN
        ALTER TABLE public.invoices ADD COLUMN company_id UUID;
        RAISE NOTICE 'Added company_id to invoices';
    END IF;

    -- Check and add created_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'created_by') THEN
        ALTER TABLE public.invoices ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added created_by to invoices';
    END IF;

    -- Check and add invoice_number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'invoice_number') THEN
        ALTER TABLE public.invoices ADD COLUMN invoice_number TEXT;
        RAISE NOTICE 'Added invoice_number to invoices';
    END IF;

    -- Check and add recipient_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'recipient_name') THEN
        ALTER TABLE public.invoices ADD COLUMN recipient_name TEXT;
        RAISE NOTICE 'Added recipient_name to invoices';
    END IF;

    -- Check and add recipient_email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'recipient_email') THEN
        ALTER TABLE public.invoices ADD COLUMN recipient_email TEXT;
        RAISE NOTICE 'Added recipient_email to invoices';
    END IF;

    -- Check and add property_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'property_id') THEN
        ALTER TABLE public.invoices ADD COLUMN property_id UUID;
        RAISE NOTICE 'Added property_id to invoices';
    END IF;

    -- Check and add issue_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'issue_date') THEN
        ALTER TABLE public.invoices ADD COLUMN issue_date DATE;
        RAISE NOTICE 'Added issue_date to invoices';
    END IF;

    -- Check and add due_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'due_date') THEN
        ALTER TABLE public.invoices ADD COLUMN due_date DATE;
        RAISE NOTICE 'Added due_date to invoices';
    END IF;

    -- Check and add items (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'items') THEN
        ALTER TABLE public.invoices ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added items to invoices';
    END IF;

    -- Check and add subtotal
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'subtotal') THEN
        ALTER TABLE public.invoices ADD COLUMN subtotal NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added subtotal to invoices';
    END IF;

    -- Check and add tax_amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'tax_amount') THEN
        ALTER TABLE public.invoices ADD COLUMN tax_amount NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added tax_amount to invoices';
    END IF;

    -- Check and add total
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'total') THEN
        ALTER TABLE public.invoices ADD COLUMN total NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added total to invoices';
    END IF;

    -- Check and add status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'status') THEN
        ALTER TABLE public.invoices ADD COLUMN status TEXT DEFAULT 'draft';
        RAISE NOTICE 'Added status to invoices';
    END IF;

    -- Check and add notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'notes') THEN
        ALTER TABLE public.invoices ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes to invoices';
    END IF;

    -- Check and add pdf_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'pdf_url') THEN
        ALTER TABLE public.invoices ADD COLUMN pdf_url TEXT;
        RAISE NOTICE 'Added pdf_url to invoices';
    END IF;

    -- Check and add created_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'created_at') THEN
        ALTER TABLE public.invoices ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at to invoices';
    END IF;

    -- Check and add updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'updated_at') THEN
        ALTER TABLE public.invoices ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at to invoices';
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 4. Drop and recreate policies
DROP POLICY IF EXISTS "Company Access Documents" ON public.documents;
CREATE POLICY "Company Access Documents" ON public.documents
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Company Access Invoices" ON public.invoices;
CREATE POLICY "Company Access Invoices" ON public.invoices
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- 5. Grant permissions
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

-- FORCE SCHEMA CACHE REFRESH
NOTIFY pgrst, 'reload schema';

-- 6. Verification Query - Run this to confirm the fix
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('documents', 'invoices')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
