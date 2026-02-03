-- Security audit logging table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    company_id UUID,
    resource_type TEXT,
    resource_id TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);

-- RLS: Only admins can view audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current company ID from profiles
CREATE OR REPLACE FUNCTION get_my_company() 
RETURNS UUID AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE;

DROP POLICY IF EXISTS "Admins can view company audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view company audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
    company_id = get_my_company() AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Anyone can insert (for logging)
DROP POLICY IF EXISTS "Anyone can create audit logs" ON public.audit_logs;
CREATE POLICY "Anyone can create audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (true);
