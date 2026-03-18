-- FIX FOR TEAM INVITATIONS RLS
-- Allow Super Admins and Admins to manage invitations

DROP POLICY IF EXISTS "Admins can view company invitations" ON public.team_invitations;
CREATE POLICY "Admins can view company invitations"
ON public.team_invitations FOR SELECT TO authenticated
USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) 
    AND (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true))
    )
);

DROP POLICY IF EXISTS "Admins can create invitations" ON public.team_invitations;
CREATE POLICY "Admins can create invitations"
ON public.team_invitations FOR INSERT TO authenticated
WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true))
    )
);

DROP POLICY IF EXISTS "Admins can update invitations" ON public.team_invitations;
CREATE POLICY "Admins can update invitations"
ON public.team_invitations FOR UPDATE TO authenticated
USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true))
    )
);

DROP POLICY IF EXISTS "Admins can delete invitations" ON public.team_invitations;
CREATE POLICY "Admins can delete invitations"
ON public.team_invitations FOR DELETE TO authenticated
USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true))
    )
);

-- ADD INDEX ON company_id for maintenance_requests to speed up loading
CREATE INDEX IF NOT EXISTS idx_maint_company ON public.maintenance_requests(company_id);

-- Also add index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_maint_status ON public.maintenance_requests(status);

SELECT 'TEAM INVITATIONS RLS & MAINTENANCE INDEXES APPLIED' as status;
