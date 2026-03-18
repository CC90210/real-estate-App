-- =============================================
-- RUN THIS IN SUPABASE DASHBOARD → SQL EDITOR
-- Creates the contacts table (fixes Communication page)
-- =============================================

CREATE TABLE IF NOT EXISTS public.contacts (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name              TEXT        NOT NULL,
    email             TEXT,
    phone             TEXT,
    type              TEXT        NOT NULL DEFAULT 'prospect'
                                  CHECK (type IN ('prospect', 'tenant', 'vendor', 'landlord', 'other')),
    company_name      TEXT,
    address           TEXT,
    notes             TEXT,
    tags              TEXT[]      DEFAULT '{}',
    property_id       UUID        REFERENCES properties(id) ON DELETE SET NULL,
    last_contacted_at TIMESTAMPTZ,
    created_by        UUID        REFERENCES auth.users(id),
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON public.contacts(type);
CREATE INDEX IF NOT EXISTS idx_contacts_company_type ON public.contacts(company_id, type);
CREATE INDEX IF NOT EXISTS idx_contacts_property_id ON public.contacts(property_id);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_select_own_company" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert_own_company" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update_own_company" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete_own_company" ON public.contacts;

CREATE POLICY "contacts_select_own_company" ON public.contacts
    FOR SELECT USING (company_id = get_my_company());

CREATE POLICY "contacts_insert_own_company" ON public.contacts
    FOR INSERT WITH CHECK (company_id = get_my_company());

CREATE POLICY "contacts_update_own_company" ON public.contacts
    FOR UPDATE USING (company_id = get_my_company());

CREATE POLICY "contacts_delete_own_company" ON public.contacts
    FOR DELETE USING (company_id = get_my_company());

CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contacts_updated_at ON public.contacts;
CREATE TRIGGER contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_contacts_updated_at();
