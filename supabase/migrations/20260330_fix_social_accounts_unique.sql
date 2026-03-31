-- Fix: scope the unique constraint on social_accounts.late_account_id
-- to be per-company instead of globally unique.
-- The global constraint breaks reconnections if Late reuses account IDs
-- or if the same Late account somehow appears in two different profiles.

DO $$ BEGIN
    ALTER TABLE public.social_accounts
        DROP CONSTRAINT IF EXISTS uq_social_accounts_late_id;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.social_accounts
        ADD CONSTRAINT uq_social_accounts_per_company UNIQUE (company_id, late_account_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
