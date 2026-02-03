-- ==============================================================================
-- PRODUCTION FIX: Complete Applications & Profiles Schema
-- Run this in Supabase SQL Editor to fix all missing columns
-- ==============================================================================

-- ============================================
-- 1. FIX APPLICATIONS TABLE - Add missing columns
-- ============================================

-- Add notes column if missing
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add other potentially missing columns
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS applicant_phone TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS employment_status TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS employer_name TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS move_in_date TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Ensure status has proper default
ALTER TABLE public.applications ALTER COLUMN status SET DEFAULT 'submitted';

-- ============================================
-- 2. FIX PROFILES TABLE - Add branding column
-- ============================================

-- Add branding column for workspace customization
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{"accent": "blue", "theme": "light"}'::jsonb;

-- Add preferences column if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- ============================================
-- 3. FIX ACTIVITY LOG TABLE - Ensure structure
-- ============================================

-- Add user_id column if missing (for tracking who did the action)
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id);

-- Add details column for rich activity data
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

-- ============================================
-- 4. CREATE/UPDATE RLS POLICIES
-- ============================================

-- Drop and recreate applications policy to ensure proper access
DROP POLICY IF EXISTS "Users can CRUD applications in their company" ON public.applications;
CREATE POLICY "Users can CRUD applications in their company" ON public.applications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = applications.company_id
        )
    );

-- Drop and recreate activity_log policy
DROP POLICY IF EXISTS "Users can view activity logs in their company" ON public.activity_log;
CREATE POLICY "Users can view activity logs in their company" ON public.activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = activity_log.company_id
        )
    );

DROP POLICY IF EXISTS "Users can insert activity logs in their company" ON public.activity_log;
CREATE POLICY "Users can insert activity logs in their company" ON public.activity_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = activity_log.company_id
        )
    );

-- ============================================
-- 5. ENSURE PROPER GRANTS
-- ============================================

GRANT ALL ON public.applications TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.activity_log TO authenticated;

-- ============================================
-- 6. RELOAD SCHEMA CACHE
-- ============================================

NOTIFY pgrst, 'reload schema';

-- ============================================
-- 7. VERIFICATION
-- ============================================

SELECT 
    'applications' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'applications' 
AND table_schema = 'public'
AND column_name IN ('notes', 'applicant_phone', 'employment_status', 'created_by')
UNION ALL
SELECT 
    'profiles' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
AND column_name IN ('branding', 'preferences');

SELECT '✅ Schema fix complete! All columns added.' AS status;
