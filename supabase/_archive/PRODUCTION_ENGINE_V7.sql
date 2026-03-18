-- ==========================================================
-- PROPFLOW TOTAL SYSTEM REPAIR (PRODUCTION ENGINE V7)
-- ==========================================================

-- 1. SYMBIOTIC MAINTENANCE LOGGING
CREATE OR REPLACE FUNCTION log_maintenance_changes()
RETURNS TRIGGER AS $$
DECLARE
    prop_address TEXT;
BEGIN
    -- Get property address for context
    SELECT address INTO prop_address FROM properties WHERE id = NEW.property_id;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO activity_log (company_id, user_id, action, entity_type, entity_id, details)
        VALUES (
            NEW.company_id, 
            NEW.submitted_by, 
            'requested', 
            'maintenance_requests', 
            NEW.id, 
            jsonb_build_object(
                'title', NEW.title,
                'description', 'New maintenance request for ' || COALESCE(prop_address, 'Property'),
                'category', NEW.category,
                'priority', NEW.priority
            )
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        INSERT INTO activity_log (company_id, user_id, action, entity_type, entity_id, details)
        VALUES (
            NEW.company_id, 
            auth.uid(), -- The person who updated it
            'status_change', 
            'maintenance_requests', 
            NEW.id, 
            jsonb_build_object(
                'title', NEW.title, 
                'description', 'Maintenance status updated to ' || NEW.status,
                'status', NEW.status
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_log_maintenance_changes ON maintenance_requests;
CREATE TRIGGER tr_log_maintenance_changes
    AFTER INSERT OR UPDATE ON maintenance_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_maintenance_changes();

-- 2. SYMBIOTIC APPLICATION LOGGING
CREATE OR REPLACE FUNCTION log_application_changes()
RETURNS TRIGGER AS $$
DECLARE
    prop_address TEXT;
BEGIN
    SELECT address INTO prop_address FROM properties WHERE id = NEW.property_id;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO activity_log (company_id, user_id, action, entity_type, entity_id, details)
        VALUES (
            NEW.company_id, 
            NEW.created_by, 
            'submitted', 
            'applications', 
            NEW.id, 
            jsonb_build_object(
                'title', NEW.applicant_name,
                'description', 'New application for ' || COALESCE(prop_address, 'Property')
            )
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        INSERT INTO activity_log (company_id, user_id, action, entity_type, entity_id, details)
        VALUES (
            NEW.company_id, 
            auth.uid(), 
            'status_change', 
            'applications', 
            NEW.id, 
            jsonb_build_object(
                'title', NEW.applicant_name,
                'description', 'Application status changed to ' || NEW.status,
                'status', NEW.status
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_log_application_changes ON applications;
CREATE TRIGGER tr_log_application_changes
    AFTER INSERT OR UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION log_application_changes();

-- 3. HARDEN RLS FOR ALL TABLES
-- Maintenance Requests
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company isolation for maintenance" ON public.maintenance_requests;
CREATE POLICY "Company isolation for maintenance" ON public.maintenance_requests
FOR ALL TO authenticated USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
) WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company isolation for applications" ON public.applications;
CREATE POLICY "Company isolation for applications" ON public.applications
FOR ALL TO authenticated USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
) WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Leases
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company isolation for leases" ON public.leases;
CREATE POLICY "Company isolation for leases" ON public.leases
FOR ALL TO authenticated USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
) WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. PERFORMANCE INDEXES FOR MAINTENANCE & APPLICATIONS
CREATE INDEX IF NOT EXISTS idx_maint_property ON public.maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maint_submitted ON public.maintenance_requests(submitted_by);
CREATE INDEX IF NOT EXISTS idx_apps_property ON public.applications(property_id);
CREATE INDEX IF NOT EXISTS idx_apps_company_status ON public.applications(company_id, status);

-- 5. SYMBIOTIC INVOICE LOGGING
CREATE OR REPLACE FUNCTION log_invoice_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO activity_log (company_id, user_id, action, entity_type, entity_id, details)
        VALUES (
            NEW.company_id, 
            NEW.created_by, 
            'created', 
            'invoices', 
            NEW.id, 
            jsonb_build_object(
                'title', 'Invoice #' || NEW.invoice_number,
                'description', 'New invoice generated for ' || NEW.recipient_name,
                'amount', NEW.total,
                'recipient', NEW.recipient_name
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_log_invoice_changes ON invoices;
CREATE TRIGGER tr_log_invoice_changes
    AFTER INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION log_invoice_changes();

SELECT 'PRODUCTION ENGINE V7 ACTIVATED' as status;
