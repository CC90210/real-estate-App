-- Migration: Add extended screening & SingleKey fields to applications
-- Date: 2026-03-21
-- Purpose: Support comprehensive tenant vetting per Joseph Shaffer's requirements

-- Extended applicant info fields
ALTER TABLE applications ADD COLUMN IF NOT EXISTS combined_household_income NUMERIC;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS employment_status TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS employment_duration TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS previous_addresses JSONB;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS current_rent NUMERIC;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS current_landlord_name TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS current_landlord_phone TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS total_debt NUMERIC;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS num_vehicles INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS is_smoker BOOLEAN DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS government_id_verified BOOLEAN;

-- Screening result fields
ALTER TABLE applications ADD COLUMN IF NOT EXISTS criminal_check_passed BOOLEAN;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS public_records_clear BOOLEAN;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS singlekey_report_url TEXT;

-- Computed / stored ratios
ALTER TABLE applications ADD COLUMN IF NOT EXISTS income_to_rent_ratio NUMERIC;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS yearly_rent_cost NUMERIC;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS dti_ratio NUMERIC;

-- SingleKey PDF uploads table (stores parsed reports per application)
CREATE TABLE IF NOT EXISTS application_screening_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    report_type TEXT DEFAULT 'singlekey', -- singlekey, credit_report, background_check, custom
    -- AI-extracted metrics from PDF
    extracted_credit_score INTEGER,
    extracted_income NUMERIC,
    extracted_criminal_clear BOOLEAN,
    extracted_public_records_clear BOOLEAN,
    extracted_bankruptcies INTEGER DEFAULT 0,
    extracted_collections INTEGER DEFAULT 0,
    extracted_legal_cases INTEGER DEFAULT 0,
    extracted_summary TEXT,              -- AI-generated summary of the report
    extracted_risk_flags JSONB,          -- Array of risk flags found by AI
    raw_extracted_data JSONB,            -- Full AI extraction results
    processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    processed_at TIMESTAMPTZ,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for screening reports
ALTER TABLE application_screening_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "screening_reports_company_select" ON application_screening_reports
    FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "screening_reports_company_insert" ON application_screening_reports
    FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "screening_reports_company_update" ON application_screening_reports
    FOR UPDATE USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "screening_reports_company_delete" ON application_screening_reports
    FOR DELETE USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Update trigger for screening reports
CREATE OR REPLACE FUNCTION update_screening_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER screening_reports_updated_at
    BEFORE UPDATE ON application_screening_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_screening_reports_updated_at();

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_screening_reports_application ON application_screening_reports(application_id);
CREATE INDEX IF NOT EXISTS idx_screening_reports_company ON application_screening_reports(company_id);
