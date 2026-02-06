-- 1. List all check constraints on 'applications'
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.applications'::regclass
AND contype = 'c';

-- 2. Check columns in 'applications'
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'applications';
