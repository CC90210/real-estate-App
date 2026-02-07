-- ==============================================================================
-- INVOICE NUMBERING BACKEND AUTOMATION
-- Ensures sequential, gap-free invoice numbers per company
-- ==============================================================================

-- 1. Add tracking columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS next_invoice_number BIGINT DEFAULT 1,
ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'INV-';

-- 2. Seed the counter based on existing data to prevent duplicates
-- We extract the numeric part of the highest invoice number for each company
-- If no legacy invoices exist, it stays at 1
UPDATE companies c
SET next_invoice_number = (
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(invoice_number, '[^0-9]', '', 'g') AS INTEGER)), 0) + 1
  FROM invoices i
  WHERE i.company_id = c.id
);

-- 3. Create an atomic function to generate the next number
-- This function locks the company row to prevent race conditions
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_num BIGINT;
    v_prefix TEXT;
    v_full_num TEXT;
BEGIN
    -- Lock the row for update to ensure atomicity
    SELECT next_invoice_number, invoice_prefix
    INTO v_next_num, v_prefix
    FROM companies
    WHERE id = p_company_id
    FOR UPDATE;

    -- Update the counter for next time
    UPDATE companies
    SET next_invoice_number = next_invoice_number + 1
    WHERE id = p_company_id;

    -- Format the current number (e.g., INV-00001)
    -- Using LPAD to ensure at least 5 digits with leading zeros
    v_full_num := v_prefix || LPAD(v_next_num::TEXT, 5, '0');
    
    RETURN v_full_num;
END;
$$;

-- 4. Grant permission to authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.generate_invoice_number TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number TO service_role;

SELECT 'INVOICE NUMBERING SYSTEM READY - COUNTERS SEEDED' as status;
