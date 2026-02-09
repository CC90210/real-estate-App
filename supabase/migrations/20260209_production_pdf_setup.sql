-- Add PDF tracking to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ;

-- Create invoice_items table if not exists (in case it wasn't there before)
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    reference TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    rate INTEGER NOT NULL, -- in cents
    amount INTEGER NOT NULL, -- in cents
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for invoice_items
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Allow read access to invoice items if user has access to the invoice
CREATE POLICY "Invoice items follow invoice access"
ON invoice_items FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoices.id = invoice_items.invoice_id 
        AND invoices.company_id = get_my_company()
    )
);

-- Storage bucket setup for documents
-- IMPORTANT: Run this SQL manually in the Supabase Dashboard SQL Editor if using managed service, 
-- or ensure the storage extension is enabled.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- RLS specific to the 'documents' bucket
CREATE POLICY "Company document upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = 'invoices' AND
    (storage.foldername(name))[2] = (SELECT company_id::text FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Public document read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'documents');
