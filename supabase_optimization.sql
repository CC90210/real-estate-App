-- Database Performance Optimization Indexes

-- Properties indexes
CREATE INDEX IF NOT EXISTS idx_properties_company_status ON properties(company_id, status);
CREATE INDEX IF NOT EXISTS idx_properties_company_created ON properties(company_id, created_at DESC);

-- Applications indexes
CREATE INDEX IF NOT EXISTS idx_applications_company_status ON applications(company_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_property ON applications(property_id);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_company_created ON invoices(company_id, created_at DESC);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_company_type ON documents(company_id, type);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_company_created ON activity_log(company_id, created_at DESC);

-- Maintenance indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_company_status ON maintenance_requests(company_id, status);

-- Showings indexes
CREATE INDEX IF NOT EXISTS idx_showings_company_date ON showings(company_id, scheduled_at);
