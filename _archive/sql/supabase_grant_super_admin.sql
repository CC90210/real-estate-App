-- =============================================
-- GRANT SUPER ADMIN ACCESS TO OWNER ACCOUNT
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Add the is_super_admin column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'is_super_admin'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_super_admin column';
    ELSE
        RAISE NOTICE 'is_super_admin column already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'is_partner'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_partner BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_partner column';
    ELSE
        RAISE NOTICE 'is_partner column already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'partner_type'
    ) THEN
        ALTER TABLE profiles ADD COLUMN partner_type TEXT DEFAULT NULL;
        RAISE NOTICE 'Added partner_type column';
    ELSE
        RAISE NOTICE 'partner_type column already exists';
    END IF;
END $$;

-- 2. Also ensure companies has is_lifetime_access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'companies' AND column_name = 'is_lifetime_access'
    ) THEN
        ALTER TABLE companies ADD COLUMN is_lifetime_access BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_lifetime_access to companies';
    ELSE
        RAISE NOTICE 'is_lifetime_access already exists';
    END IF;
END $$;

-- 3. Set your account as Super Admin (by email)
UPDATE profiles
SET is_super_admin = true
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'konamak@icloud.com'
);

-- 4. Also set your company to enterprise + lifetime
UPDATE companies
SET
    subscription_plan = 'enterprise',
    subscription_status = 'active',
    is_lifetime_access = true
WHERE id IN (
    SELECT company_id FROM profiles
    WHERE id IN (SELECT id FROM auth.users WHERE email = 'konamak@icloud.com')
);

-- 5. Verify
SELECT
    p.id,
    u.email,
    p.is_super_admin,
    p.is_partner,
    p.company_id,
    c.subscription_plan,
    c.subscription_status,
    c.is_lifetime_access
FROM profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN companies c ON c.id = p.company_id
WHERE u.email = 'konamak@icloud.com';
