-- ==============================================================================
-- FIX SHOWINGS RLS & CALENDAR ISSUES
-- ==============================================================================

-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS public.showings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  agent_id UUID REFERENCES profiles(id),
  company_id UUID,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Index for Performance
CREATE INDEX IF NOT EXISTS idx_showings_company ON showings(company_id);
CREATE INDEX IF NOT EXISTS idx_showings_date ON showings(scheduled_date);

-- 3. RLS
ALTER TABLE public.showings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company Access Showings ALL" ON public.showings;
CREATE POLICY "Company Access Showings ALL" ON public.showings
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id());

NOTIFY pgrst, 'reload schema';
