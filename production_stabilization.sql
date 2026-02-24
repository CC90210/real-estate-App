-- ============================================================
-- PROPFLOW PRODUCTION STABILIZATION SQL
-- Run this ENTIRE script in Supabase SQL Editor (single execution)
-- ============================================================
-- PHASE 1.3: RLS INFINITE RECURSION FIX
-- PHASE 5.2: SOCIAL MEDIA SUITE TABLES
-- ============================================================
-- ============================================================
-- PHASE 1.3: FIX RLS INFINITE RECURSION
-- ============================================================
-- The recurring "infinite recursion detected in policy for 
-- relation 'profiles'" error happens because RLS policies on 
-- the profiles table reference themselves. This SECURITY DEFINER
-- function is called once and cached, preventing recursion.
-- ============================================================
-- STEP 1: Create a SECURITY DEFINER function that bypasses RLS
CREATE OR REPLACE FUNCTION get_my_company_id() RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
SELECT company_id
FROM profiles
WHERE id = auth.uid() $$;
-- STEP 2: Drop ALL existing policies on profiles (safe — we recreate them below)
DROP POLICY IF EXISTS "Users can view own company profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
-- STEP 3: Create simple, non-recursive policies for profiles
CREATE POLICY "profiles_select" ON profiles FOR
SELECT USING (
        id = auth.uid()
        OR company_id = get_my_company_id()
    );
CREATE POLICY "profiles_update" ON profiles FOR
UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR
INSERT WITH CHECK (id = auth.uid());
-- STEP 4: Fix properties policies
DROP POLICY IF EXISTS "properties_select_policy" ON properties;
DROP POLICY IF EXISTS "properties_insert_policy" ON properties;
DROP POLICY IF EXISTS "properties_update_policy" ON properties;
DROP POLICY IF EXISTS "properties_delete_policy" ON properties;
DROP POLICY IF EXISTS "properties_select" ON properties;
DROP POLICY IF EXISTS "properties_insert" ON properties;
DROP POLICY IF EXISTS "properties_update" ON properties;
DROP POLICY IF EXISTS "properties_delete" ON properties;
CREATE POLICY "properties_select" ON properties FOR
SELECT USING (company_id = get_my_company_id());
CREATE POLICY "properties_insert" ON properties FOR
INSERT WITH CHECK (company_id = get_my_company_id());
CREATE POLICY "properties_update" ON properties FOR
UPDATE USING (company_id = get_my_company_id());
CREATE POLICY "properties_delete" ON properties FOR DELETE USING (company_id = get_my_company_id());
-- STEP 5: Fix areas policies
DROP POLICY IF EXISTS "areas_select_policy" ON areas;
DROP POLICY IF EXISTS "areas_insert_policy" ON areas;
DROP POLICY IF EXISTS "areas_update_policy" ON areas;
DROP POLICY IF EXISTS "areas_delete_policy" ON areas;
DROP POLICY IF EXISTS "areas_select" ON areas;
DROP POLICY IF EXISTS "areas_insert" ON areas;
DROP POLICY IF EXISTS "areas_update" ON areas;
DROP POLICY IF EXISTS "areas_delete" ON areas;
CREATE POLICY "areas_select" ON areas FOR
SELECT USING (company_id = get_my_company_id());
CREATE POLICY "areas_insert" ON areas FOR
INSERT WITH CHECK (company_id = get_my_company_id());
CREATE POLICY "areas_update" ON areas FOR
UPDATE USING (company_id = get_my_company_id());
CREATE POLICY "areas_delete" ON areas FOR DELETE USING (company_id = get_my_company_id());
-- STEP 6: Fix applications policies
DROP POLICY IF EXISTS "applications_select_policy" ON applications;
DROP POLICY IF EXISTS "applications_insert_policy" ON applications;
DROP POLICY IF EXISTS "applications_update_policy" ON applications;
DROP POLICY IF EXISTS "applications_delete_policy" ON applications;
DROP POLICY IF EXISTS "applications_select" ON applications;
DROP POLICY IF EXISTS "applications_insert" ON applications;
DROP POLICY IF EXISTS "applications_update" ON applications;
DROP POLICY IF EXISTS "applications_delete" ON applications;
CREATE POLICY "applications_select" ON applications FOR
SELECT USING (company_id = get_my_company_id());
CREATE POLICY "applications_insert" ON applications FOR
INSERT WITH CHECK (company_id = get_my_company_id());
CREATE POLICY "applications_update" ON applications FOR
UPDATE USING (company_id = get_my_company_id());
CREATE POLICY "applications_delete" ON applications FOR DELETE USING (company_id = get_my_company_id());
-- STEP 7: Fix approvals policies (if table exists)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'approvals'
) THEN EXECUTE 'DROP POLICY IF EXISTS "approvals_select_policy" ON approvals';
EXECUTE 'DROP POLICY IF EXISTS "approvals_select" ON approvals';
EXECUTE 'DROP POLICY IF EXISTS "approvals_insert" ON approvals';
EXECUTE 'DROP POLICY IF EXISTS "approvals_update" ON approvals';
EXECUTE 'DROP POLICY IF EXISTS "approvals_delete" ON approvals';
EXECUTE 'CREATE POLICY "approvals_select" ON approvals FOR SELECT USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "approvals_insert" ON approvals FOR INSERT WITH CHECK (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "approvals_update" ON approvals FOR UPDATE USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "approvals_delete" ON approvals FOR DELETE USING (company_id = get_my_company_id())';
END IF;
END $$;
-- STEP 8: Fix leases policies (if table exists)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'leases'
) THEN EXECUTE 'DROP POLICY IF EXISTS "leases_select_policy" ON leases';
EXECUTE 'DROP POLICY IF EXISTS "leases_select" ON leases';
EXECUTE 'DROP POLICY IF EXISTS "leases_insert" ON leases';
EXECUTE 'DROP POLICY IF EXISTS "leases_update" ON leases';
EXECUTE 'DROP POLICY IF EXISTS "leases_delete" ON leases';
EXECUTE 'CREATE POLICY "leases_select" ON leases FOR SELECT USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "leases_insert" ON leases FOR INSERT WITH CHECK (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "leases_update" ON leases FOR UPDATE USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "leases_delete" ON leases FOR DELETE USING (company_id = get_my_company_id())';
END IF;
END $$;
-- STEP 9: Fix maintenance policies (if table exists)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'maintenance'
) THEN EXECUTE 'DROP POLICY IF EXISTS "maintenance_select_policy" ON maintenance';
EXECUTE 'DROP POLICY IF EXISTS "maintenance_select" ON maintenance';
EXECUTE 'DROP POLICY IF EXISTS "maintenance_insert" ON maintenance';
EXECUTE 'DROP POLICY IF EXISTS "maintenance_update" ON maintenance';
EXECUTE 'DROP POLICY IF EXISTS "maintenance_delete" ON maintenance';
EXECUTE 'CREATE POLICY "maintenance_select" ON maintenance FOR SELECT USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "maintenance_insert" ON maintenance FOR INSERT WITH CHECK (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "maintenance_update" ON maintenance FOR UPDATE USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "maintenance_delete" ON maintenance FOR DELETE USING (company_id = get_my_company_id())';
END IF;
END $$;
-- STEP 10: Fix showings policies (if table exists)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'showings'
) THEN EXECUTE 'DROP POLICY IF EXISTS "showings_select_policy" ON showings';
EXECUTE 'DROP POLICY IF EXISTS "showings_select" ON showings';
EXECUTE 'DROP POLICY IF EXISTS "showings_insert" ON showings';
EXECUTE 'DROP POLICY IF EXISTS "showings_update" ON showings';
EXECUTE 'DROP POLICY IF EXISTS "showings_delete" ON showings';
EXECUTE 'CREATE POLICY "showings_select" ON showings FOR SELECT USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "showings_insert" ON showings FOR INSERT WITH CHECK (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "showings_update" ON showings FOR UPDATE USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "showings_delete" ON showings FOR DELETE USING (company_id = get_my_company_id())';
END IF;
END $$;
-- STEP 11: Fix invoices policies (if table exists)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'invoices'
) THEN EXECUTE 'DROP POLICY IF EXISTS "invoices_select_policy" ON invoices';
EXECUTE 'DROP POLICY IF EXISTS "invoices_select" ON invoices';
EXECUTE 'DROP POLICY IF EXISTS "invoices_insert" ON invoices';
EXECUTE 'DROP POLICY IF EXISTS "invoices_update" ON invoices';
EXECUTE 'DROP POLICY IF EXISTS "invoices_delete" ON invoices';
EXECUTE 'CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "invoices_insert" ON invoices FOR INSERT WITH CHECK (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "invoices_update" ON invoices FOR UPDATE USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "invoices_delete" ON invoices FOR DELETE USING (company_id = get_my_company_id())';
END IF;
END $$;
-- STEP 12: Fix documents policies (if table exists)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'documents'
) THEN EXECUTE 'DROP POLICY IF EXISTS "documents_select_policy" ON documents';
EXECUTE 'DROP POLICY IF EXISTS "documents_select" ON documents';
EXECUTE 'DROP POLICY IF EXISTS "documents_insert" ON documents';
EXECUTE 'DROP POLICY IF EXISTS "documents_update" ON documents';
EXECUTE 'DROP POLICY IF EXISTS "documents_delete" ON documents';
EXECUTE 'CREATE POLICY "documents_select" ON documents FOR SELECT USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "documents_insert" ON documents FOR INSERT WITH CHECK (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "documents_update" ON documents FOR UPDATE USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "documents_delete" ON documents FOR DELETE USING (company_id = get_my_company_id())';
END IF;
END $$;
-- STEP 13: Fix contacts policies (if table exists)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'contacts'
) THEN EXECUTE 'DROP POLICY IF EXISTS "contacts_select_policy" ON contacts';
EXECUTE 'DROP POLICY IF EXISTS "contacts_select" ON contacts';
EXECUTE 'DROP POLICY IF EXISTS "contacts_insert" ON contacts';
EXECUTE 'DROP POLICY IF EXISTS "contacts_update" ON contacts';
EXECUTE 'DROP POLICY IF EXISTS "contacts_delete" ON contacts';
EXECUTE 'CREATE POLICY "contacts_select" ON contacts FOR SELECT USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "contacts_insert" ON contacts FOR INSERT WITH CHECK (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "contacts_update" ON contacts FOR UPDATE USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "contacts_delete" ON contacts FOR DELETE USING (company_id = get_my_company_id())';
END IF;
END $$;
-- STEP 14: Fix activity_log policies (if table exists)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'activity_log'
) THEN EXECUTE 'DROP POLICY IF EXISTS "activity_log_select_policy" ON activity_log';
EXECUTE 'DROP POLICY IF EXISTS "activity_log_select" ON activity_log';
EXECUTE 'DROP POLICY IF EXISTS "activity_log_insert" ON activity_log';
EXECUTE 'DROP POLICY IF EXISTS "activity_log_update" ON activity_log';
EXECUTE 'DROP POLICY IF EXISTS "activity_log_delete" ON activity_log';
EXECUTE 'CREATE POLICY "activity_log_select" ON activity_log FOR SELECT USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "activity_log_insert" ON activity_log FOR INSERT WITH CHECK (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "activity_log_update" ON activity_log FOR UPDATE USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "activity_log_delete" ON activity_log FOR DELETE USING (company_id = get_my_company_id())';
END IF;
END $$;
-- STEP 15: Fix automation_settings policies (if table exists)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'automation_settings'
) THEN EXECUTE 'DROP POLICY IF EXISTS "automation_settings_select_policy" ON automation_settings';
EXECUTE 'DROP POLICY IF EXISTS "automation_settings_select" ON automation_settings';
EXECUTE 'DROP POLICY IF EXISTS "automation_settings_insert" ON automation_settings';
EXECUTE 'DROP POLICY IF EXISTS "automation_settings_update" ON automation_settings';
EXECUTE 'DROP POLICY IF EXISTS "automation_settings_delete" ON automation_settings';
EXECUTE 'CREATE POLICY "automation_settings_select" ON automation_settings FOR SELECT USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "automation_settings_insert" ON automation_settings FOR INSERT WITH CHECK (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "automation_settings_update" ON automation_settings FOR UPDATE USING (company_id = get_my_company_id())';
EXECUTE 'CREATE POLICY "automation_settings_delete" ON automation_settings FOR DELETE USING (company_id = get_my_company_id())';
END IF;
END $$;
-- ============================================================
-- PHASE 5.2: SOCIAL MEDIA SUITE — NEW TABLES
-- ============================================================
-- Add Late profile ID column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS late_profile_id TEXT;
-- Create social_accounts table (connected social media accounts)
CREATE TABLE IF NOT EXISTS social_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    late_account_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    account_name TEXT,
    account_avatar TEXT,
    connected_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- Create social_posts table (posts created through PropFlow)
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id),
    late_post_id TEXT,
    content TEXT NOT NULL,
    media_urls TEXT [],
    hashtags TEXT [],
    platforms TEXT [] NOT NULL,
    status TEXT DEFAULT 'draft',
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- Enable RLS on new tables
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
-- RLS Policies for social_accounts
DROP POLICY IF EXISTS "social_accounts_select" ON social_accounts;
DROP POLICY IF EXISTS "social_accounts_insert" ON social_accounts;
DROP POLICY IF EXISTS "social_accounts_update" ON social_accounts;
DROP POLICY IF EXISTS "social_accounts_delete" ON social_accounts;
CREATE POLICY "social_accounts_select" ON social_accounts FOR
SELECT USING (company_id = get_my_company_id());
CREATE POLICY "social_accounts_insert" ON social_accounts FOR
INSERT WITH CHECK (company_id = get_my_company_id());
CREATE POLICY "social_accounts_update" ON social_accounts FOR
UPDATE USING (company_id = get_my_company_id());
CREATE POLICY "social_accounts_delete" ON social_accounts FOR DELETE USING (company_id = get_my_company_id());
-- RLS Policies for social_posts
DROP POLICY IF EXISTS "social_posts_select" ON social_posts;
DROP POLICY IF EXISTS "social_posts_insert" ON social_posts;
DROP POLICY IF EXISTS "social_posts_update" ON social_posts;
DROP POLICY IF EXISTS "social_posts_delete" ON social_posts;
CREATE POLICY "social_posts_select" ON social_posts FOR
SELECT USING (company_id = get_my_company_id());
CREATE POLICY "social_posts_insert" ON social_posts FOR
INSERT WITH CHECK (company_id = get_my_company_id());
CREATE POLICY "social_posts_update" ON social_posts FOR
UPDATE USING (company_id = get_my_company_id());
CREATE POLICY "social_posts_delete" ON social_posts FOR DELETE USING (company_id = get_my_company_id());
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_social_accounts_company ON social_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_status ON social_accounts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_company ON social_posts(company_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_by ON social_posts(created_by);
-- ============================================================
-- DONE! 
-- ============================================================
-- This script:
--   1. Creates get_my_company_id() SECURITY DEFINER function
--   2. Replaces ALL recursive RLS policies on every table
--   3. Creates social_accounts & social_posts tables
--   4. Adds late_profile_id to companies
--   5. Sets up RLS + indexes for all new tables
-- ============================================================