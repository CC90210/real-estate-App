-- ============================================
-- PROPFLOW FEATURE EXPANSION MIGRATION
-- Run in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. LEASES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.leases (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES auth.users(id),
    tenant_name text NOT NULL,
    tenant_email text NOT NULL,
    tenant_phone text,

    -- Lease Terms
    start_date date NOT NULL,
    end_date date NOT NULL,
    rent_amount numeric NOT NULL,
    deposit_amount numeric DEFAULT 0,
    payment_day integer DEFAULT 1 CHECK (payment_day BETWEEN 1 AND 28),
    
    -- Status
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expiring', 'expired', 'terminated', 'renewed')),
    
    -- Renewal
    auto_renew boolean DEFAULT false,
    renewal_notice_days integer DEFAULT 60,
    rent_escalation_pct numeric DEFAULT 0,

    -- Documents
    lease_document_url text,
    signed_at timestamp with time zone,
    
    -- Metadata
    notes text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view leases" ON public.leases
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Admins/Agents can manage leases" ON public.leases
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'agent')
        )
    );

-- Tenants can view their own leases
CREATE POLICY "Tenants can view own leases" ON public.leases
    FOR SELECT USING (tenant_id = auth.uid());

CREATE INDEX idx_leases_company ON public.leases(company_id);
CREATE INDEX idx_leases_property ON public.leases(property_id);
CREATE INDEX idx_leases_tenant ON public.leases(tenant_id);
CREATE INDEX idx_leases_status ON public.leases(status);
CREATE INDEX idx_leases_end_date ON public.leases(end_date);


-- ============================================
-- 2. MAINTENANCE REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    lease_id uuid REFERENCES public.leases(id),
    submitted_by uuid REFERENCES auth.users(id),
    
    -- Request Details
    title text NOT NULL,
    description text NOT NULL,
    category text DEFAULT 'general' CHECK (category IN (
        'plumbing', 'electrical', 'hvac', 'appliance', 'structural',
        'pest', 'landscaping', 'security', 'general', 'emergency'
    )),
    priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
    status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending_parts', 'scheduled', 'completed', 'cancelled')),
    
    -- Assignment
    assigned_to uuid REFERENCES auth.users(id),
    
    -- Resolution
    resolution_notes text,
    resolved_at timestamp with time zone,
    estimated_cost numeric,
    actual_cost numeric,
    
    -- Photos
    photos text[] DEFAULT '{}',
    
    -- Scheduling
    scheduled_date date,
    scheduled_time text,
    
    -- Metadata
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view maintenance" ON public.maintenance_requests
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Anyone can create maintenance requests" ON public.maintenance_requests
    FOR INSERT WITH CHECK (
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR submitted_by = auth.uid()
    );

CREATE POLICY "Admins/Agents can manage maintenance" ON public.maintenance_requests
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'agent')
        )
    );

-- Tenants can view their own requests
CREATE POLICY "Tenants can view own maintenance" ON public.maintenance_requests
    FOR SELECT USING (submitted_by = auth.uid());

CREATE INDEX idx_maintenance_company ON public.maintenance_requests(company_id);
CREATE INDEX idx_maintenance_property ON public.maintenance_requests(property_id);
CREATE INDEX idx_maintenance_status ON public.maintenance_requests(status);
CREATE INDEX idx_maintenance_priority ON public.maintenance_requests(priority);


-- ============================================
-- 3. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Content
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'action')),
    category text DEFAULT 'general' CHECK (category IN (
        'general', 'application', 'maintenance', 'lease', 'invoice', 
        'showing', 'team', 'system', 'payment'
    )),
    
    -- Link
    action_url text,
    action_label text,
    
    -- State
    read boolean DEFAULT false,
    read_at timestamp with time zone,
    
    -- Email
    email_sent boolean DEFAULT false,
    email_sent_at timestamp with time zone,
    
    -- Metadata
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE read = false;
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);


-- ============================================
-- 4. COMMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.commissions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    agent_id uuid NOT NULL REFERENCES auth.users(id),
    property_id uuid REFERENCES public.properties(id),
    lease_id uuid REFERENCES public.leases(id),
    
    -- Commission Details
    type text DEFAULT 'lease' CHECK (type IN ('lease', 'renewal', 'referral', 'management_fee', 'bonus')),
    amount numeric NOT NULL,
    rate numeric, -- percentage if applicable
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    
    -- Payment
    paid_at timestamp with time zone,
    payment_reference text,
    
    -- Notes
    description text,
    notes text,
    
    -- Metadata
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view commissions" ON public.commissions
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage commissions" ON public.commissions
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Agents can view their own
CREATE POLICY "Agents can view own commissions" ON public.commissions
    FOR SELECT USING (agent_id = auth.uid());

CREATE INDEX idx_commissions_company ON public.commissions(company_id);
CREATE INDEX idx_commissions_agent ON public.commissions(agent_id);
CREATE INDEX idx_commissions_status ON public.commissions(status);


-- ============================================
-- 5. CONTACTS TABLE (CRM)
-- ============================================
CREATE TABLE IF NOT EXISTS public.contacts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Contact Info
    name text NOT NULL,
    email text,
    phone text,
    type text DEFAULT 'prospect' CHECK (type IN ('prospect', 'tenant', 'vendor', 'landlord', 'other')),
    
    -- Details
    company_name text,
    address text,
    notes text,
    tags text[] DEFAULT '{}',
    
    -- Source
    source text DEFAULT 'manual' CHECK (source IN ('manual', 'application', 'showing', 'referral', 'website', 'import')),
    
    -- Related
    related_property_id uuid REFERENCES public.properties(id),
    
    -- Metadata
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view contacts" ON public.contacts
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Company members can manage contacts" ON public.contacts
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'agent')
        )
    );

CREATE INDEX idx_contacts_company ON public.contacts(company_id);
CREATE INDEX idx_contacts_type ON public.contacts(type);
CREATE INDEX idx_contacts_email ON public.contacts(email);


-- ============================================
-- 6. AUTO-UPDATE TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all new tables
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['leases', 'maintenance_requests', 'commissions', 'contacts'])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS %I ON public.%I;
            CREATE TRIGGER %I
                BEFORE UPDATE ON public.%I
                FOR EACH ROW EXECUTE FUNCTION update_updated_at();
        ', 'update_' || tbl || '_updated_at', tbl, 'update_' || tbl || '_updated_at', tbl);
    END LOOP;
END $$;


-- ============================================
-- 7. LEASE EXPIRY AUTO-STATUS
-- ============================================
CREATE OR REPLACE FUNCTION check_lease_expiry()
RETURNS void AS $$
BEGIN
    -- Mark leases expiring within 60 days
    UPDATE public.leases 
    SET status = 'expiring', updated_at = now()
    WHERE status = 'active' 
    AND end_date <= CURRENT_DATE + INTERVAL '60 days'
    AND end_date > CURRENT_DATE;
    
    -- Mark expired leases
    UPDATE public.leases 
    SET status = 'expired', updated_at = now()
    WHERE status IN ('active', 'expiring') 
    AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
