-- =================================================================
-- INSPECTIONS AND WORKFLOW MIGRATION
-- =================================================================
-- Creates tables for the PropFlow pre-rental inspection system and
-- Phase 8 key handoff tracking. Also extends the properties table
-- with video walkthrough and workflow gate columns.
-- =================================================================

BEGIN;

-- =================================================================
-- 1. inspection_templates
-- =================================================================
-- Stores customisable, per-company checklist templates. The items
-- column holds an array of InspectionTemplateItem objects (JSONB).
-- =================================================================

CREATE TABLE IF NOT EXISTS public.inspection_templates (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    description TEXT,
    items       JSONB       NOT NULL DEFAULT '[]',
    is_default  BOOLEAN     DEFAULT false,
    created_by  UUID        REFERENCES auth.users(id),
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_templates_company_id
    ON inspection_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_inspection_templates_is_default
    ON inspection_templates(company_id, is_default);

ALTER TABLE inspection_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company users can view inspection_templates"  ON inspection_templates;
DROP POLICY IF EXISTS "Company users can insert inspection_templates" ON inspection_templates;
DROP POLICY IF EXISTS "Company users can update inspection_templates" ON inspection_templates;
DROP POLICY IF EXISTS "Company users can delete inspection_templates" ON inspection_templates;

CREATE POLICY "Company users can view inspection_templates"
ON inspection_templates FOR SELECT TO authenticated
USING (company_id = get_my_company());

CREATE POLICY "Company users can insert inspection_templates"
ON inspection_templates FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can update inspection_templates"
ON inspection_templates FOR UPDATE TO authenticated
USING (company_id = get_my_company())
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can delete inspection_templates"
ON inspection_templates FOR DELETE TO authenticated
USING (company_id = get_my_company());

CREATE OR REPLACE FUNCTION update_inspection_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inspection_templates_updated_at ON inspection_templates;
CREATE TRIGGER inspection_templates_updated_at
    BEFORE UPDATE ON inspection_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_inspection_templates_updated_at();

-- =================================================================
-- 2. inspections
-- =================================================================
-- One inspection record per property visit. References an optional
-- template and tracks the overall pass/fail gate status.
-- =================================================================

CREATE TABLE IF NOT EXISTS public.inspections (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id            UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    property_id           UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    template_id           UUID        REFERENCES inspection_templates(id),
    inspected_by          UUID        NOT NULL REFERENCES auth.users(id),
    inspected_by_name     TEXT        NOT NULL,
    status                TEXT        NOT NULL DEFAULT 'not_started'
                              CHECK (status IN ('not_started', 'in_progress', 'passed', 'failed', 'overridden')),
    notes                 TEXT,
    signed_at             TIMESTAMPTZ,
    landlord_notified_at  TIMESTAMPTZ,
    created_at            TIMESTAMPTZ DEFAULT now(),
    updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspections_company_id
    ON inspections(company_id);
CREATE INDEX IF NOT EXISTS idx_inspections_property_id
    ON inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_inspections_template_id
    ON inspections(template_id);
CREATE INDEX IF NOT EXISTS idx_inspections_inspected_by
    ON inspections(inspected_by);
CREATE INDEX IF NOT EXISTS idx_inspections_status
    ON inspections(status);

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company users can view inspections"  ON inspections;
DROP POLICY IF EXISTS "Company users can insert inspections" ON inspections;
DROP POLICY IF EXISTS "Company users can update inspections" ON inspections;
DROP POLICY IF EXISTS "Company users can delete inspections" ON inspections;

CREATE POLICY "Company users can view inspections"
ON inspections FOR SELECT TO authenticated
USING (company_id = get_my_company());

CREATE POLICY "Company users can insert inspections"
ON inspections FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can update inspections"
ON inspections FOR UPDATE TO authenticated
USING (company_id = get_my_company())
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can delete inspections"
ON inspections FOR DELETE TO authenticated
USING (company_id = get_my_company());

CREATE OR REPLACE FUNCTION update_inspections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inspections_updated_at ON inspections;
CREATE TRIGGER inspections_updated_at
    BEFORE UPDATE ON inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_inspections_updated_at();

-- =================================================================
-- 3. inspection_items
-- =================================================================
-- Individual checklist rows within an inspection. Company isolation
-- is enforced via the parent inspections row (JOIN-based policy).
-- =================================================================

CREATE TABLE IF NOT EXISTS public.inspection_items (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id            UUID        NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    label                    TEXT        NOT NULL,
    category                 TEXT        NOT NULL DEFAULT 'general',
    status                   TEXT        NOT NULL DEFAULT 'not_checked'
                                 CHECK (status IN ('pass', 'fail', 'not_checked')),
    notes                    TEXT,
    photo_urls               TEXT[]      DEFAULT '{}',
    maintenance_request_id   UUID        REFERENCES maintenance_requests(id),
    landlord_override        BOOLEAN     DEFAULT false,
    landlord_override_at     TIMESTAMPTZ,
    landlord_override_reason TEXT,
    created_at               TIMESTAMPTZ DEFAULT now(),
    updated_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection_id
    ON inspection_items(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_status
    ON inspection_items(status);
CREATE INDEX IF NOT EXISTS idx_inspection_items_maintenance_request_id
    ON inspection_items(maintenance_request_id);

ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;

-- Access is granted when the parent inspection belongs to the user's company.
DROP POLICY IF EXISTS "Company users can view inspection_items"  ON inspection_items;
DROP POLICY IF EXISTS "Company users can insert inspection_items" ON inspection_items;
DROP POLICY IF EXISTS "Company users can update inspection_items" ON inspection_items;
DROP POLICY IF EXISTS "Company users can delete inspection_items" ON inspection_items;

CREATE POLICY "Company users can view inspection_items"
ON inspection_items FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM inspections
        WHERE inspections.id = inspection_items.inspection_id
          AND inspections.company_id = get_my_company()
    )
);

CREATE POLICY "Company users can insert inspection_items"
ON inspection_items FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM inspections
        WHERE inspections.id = inspection_items.inspection_id
          AND inspections.company_id = get_my_company()
    )
);

CREATE POLICY "Company users can update inspection_items"
ON inspection_items FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM inspections
        WHERE inspections.id = inspection_items.inspection_id
          AND inspections.company_id = get_my_company()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM inspections
        WHERE inspections.id = inspection_items.inspection_id
          AND inspections.company_id = get_my_company()
    )
);

CREATE POLICY "Company users can delete inspection_items"
ON inspection_items FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM inspections
        WHERE inspections.id = inspection_items.inspection_id
          AND inspections.company_id = get_my_company()
    )
);

CREATE OR REPLACE FUNCTION update_inspection_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inspection_items_updated_at ON inspection_items;
CREATE TRIGGER inspection_items_updated_at
    BEFORE UPDATE ON inspection_items
    FOR EACH ROW
    EXECUTE FUNCTION update_inspection_items_updated_at();

-- =================================================================
-- 4. key_handoffs
-- =================================================================
-- Phase 8 key handoff tracking — records how and when keys were
-- transferred to a new tenant at move-in.
-- =================================================================

CREATE TABLE IF NOT EXISTS public.key_handoffs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    property_id     UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    lease_id        UUID        REFERENCES leases(id),
    tenant_name     TEXT        NOT NULL,
    handoff_method  TEXT        NOT NULL DEFAULT 'in_person'
                        CHECK (handoff_method IN ('in_person', 'concierge', 'lockbox', 'other')),
    handoff_details TEXT,
    move_in_date    DATE        NOT NULL,
    completed_at    TIMESTAMPTZ,
    completed_by    UUID        REFERENCES auth.users(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_key_handoffs_company_id
    ON key_handoffs(company_id);
CREATE INDEX IF NOT EXISTS idx_key_handoffs_property_id
    ON key_handoffs(property_id);
CREATE INDEX IF NOT EXISTS idx_key_handoffs_lease_id
    ON key_handoffs(lease_id);
CREATE INDEX IF NOT EXISTS idx_key_handoffs_move_in_date
    ON key_handoffs(move_in_date);

ALTER TABLE key_handoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company users can view key_handoffs"  ON key_handoffs;
DROP POLICY IF EXISTS "Company users can insert key_handoffs" ON key_handoffs;
DROP POLICY IF EXISTS "Company users can update key_handoffs" ON key_handoffs;
DROP POLICY IF EXISTS "Company users can delete key_handoffs" ON key_handoffs;

CREATE POLICY "Company users can view key_handoffs"
ON key_handoffs FOR SELECT TO authenticated
USING (company_id = get_my_company());

CREATE POLICY "Company users can insert key_handoffs"
ON key_handoffs FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can update key_handoffs"
ON key_handoffs FOR UPDATE TO authenticated
USING (company_id = get_my_company())
WITH CHECK (company_id = get_my_company());

CREATE POLICY "Company users can delete key_handoffs"
ON key_handoffs FOR DELETE TO authenticated
USING (company_id = get_my_company());

CREATE OR REPLACE FUNCTION update_key_handoffs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS key_handoffs_updated_at ON key_handoffs;
CREATE TRIGGER key_handoffs_updated_at
    BEFORE UPDATE ON key_handoffs
    FOR EACH ROW
    EXECUTE FUNCTION update_key_handoffs_updated_at();

-- =================================================================
-- 5. Extend properties table with workflow gate columns
-- =================================================================
-- These columns track where a property sits in the 8-phase rental
-- workflow and the result of its pre-rental inspection gate.
-- =================================================================

ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS video_walkthrough_url TEXT;

ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS workflow_phase TEXT DEFAULT 'onboarding'
        CHECK (workflow_phase IN (
            'onboarding', 'inspection', 'listing', 'communication',
            'application', 'documents', 'payment', 'handoff', 'occupied'
        ));

ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS inspection_status TEXT DEFAULT 'not_started'
        CHECK (inspection_status IN (
            'not_started', 'in_progress', 'passed', 'failed', 'overridden'
        ));

-- Index on workflow_phase supports dashboard queries that filter by phase.
CREATE INDEX IF NOT EXISTS idx_properties_workflow_phase
    ON properties(company_id, workflow_phase);

CREATE INDEX IF NOT EXISTS idx_properties_inspection_status
    ON properties(company_id, inspection_status);

COMMIT;

-- =================================================================
-- EXECUTION COMPLETE:
-- 1. inspection_templates — company-scoped customisable checklists
-- 2. inspections          — per-property inspection records
-- 3. inspection_items     — individual checklist rows (join-scoped RLS)
-- 4. key_handoffs         — Phase 8 move-in key transfer tracking
-- 5. properties           — extended with video_walkthrough_url,
--                           workflow_phase, and inspection_status
-- =================================================================
