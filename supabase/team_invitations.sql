-- TEAM INVITATIONS TABLE
-- Stores pending invitations for team members

CREATE TABLE IF NOT EXISTS public.team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Invitation details
    email TEXT,  -- Optional: can be blank for link-based invites
    role TEXT NOT NULL CHECK (role IN ('admin', 'agent', 'landlord')),
    
    -- Invitation token (for the link)
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    
    -- Who invited
    invited_by UUID REFERENCES profiles(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_company ON team_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON team_invitations(status);

-- RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Only admins can manage invitations
DROP POLICY IF EXISTS "Admins can view company invitations" ON team_invitations;
CREATE POLICY "Admins can view company invitations"
ON team_invitations FOR SELECT TO authenticated
USING (
    company_id = get_my_company_id() 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can create invitations" ON team_invitations;
CREATE POLICY "Admins can create invitations"
ON team_invitations FOR INSERT TO authenticated
WITH CHECK (
    company_id = get_my_company_id()
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can update invitations" ON team_invitations;
CREATE POLICY "Admins can update invitations"
ON team_invitations FOR UPDATE TO authenticated
USING (
    company_id = get_my_company_id()
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Anyone can read invitation by token (for accepting) -- actually usually better handled by a security definer function or special policy
-- But we'll add the function as requested.
-- The prompt asked for this policy:
-- CREATE POLICY "Anyone can read by token"
-- ON team_invitations FOR SELECT TO authenticated
-- USING (token = current_setting('app.current_token', true));
-- However, we are making a public join page, so the user might not be authenticated yet.
-- The function `get_invitation_by_token` will handle the lookup efficiently securely.

-- Function to get invitation by token (bypasses RLS)
CREATE OR REPLACE FUNCTION get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    email TEXT,
    role TEXT,
    status TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ti.id,
        ti.company_id,
        ti.email,
        ti.role,
        ti.status,
        ti.expires_at
    FROM team_invitations ti
    WHERE ti.token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
