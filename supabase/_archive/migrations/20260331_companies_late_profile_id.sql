ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS late_profile_id TEXT;
NOTIFY pgrst, 'reload schema';
