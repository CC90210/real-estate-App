-- ==============================================================================
-- ADD MULTI-CURRENCY SUPPORT TO FINANCIAL DOCUMENTS
-- ==============================================================================

-- 1. Update Invoices Table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- 2. Update Documents Table (for Lease Proposals/Financial Summaries)
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN public.invoices.currency IS 'ISO Currency Code (USD, EUR, GBP, etc.) for financial calculations';
COMMENT ON COLUMN public.documents.currency IS 'ISO Currency Code used for financial terms within the document content';
