# PropFlow Migration Writer Agent

Specialized agent for writing Supabase SQL migrations.

## Migration Template
```sql
-- ============================================================================
-- [TITLE]: Brief description
-- [DATE]: YYYYMMDD
-- ============================================================================

-- 1. Create tables (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.table_name (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add columns (safe idempotent pattern)
DO $$ BEGIN
    ALTER TABLE public.table_name ADD COLUMN new_col TYPE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. Add FK constraints (safe idempotent pattern)
DO $$ BEGIN
    ALTER TABLE public.table_name
        ADD CONSTRAINT table_name_col_fkey
        FOREIGN KEY (col) REFERENCES public.other_table(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Enable RLS
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Company isolation" ON public.table_name
    FOR ALL USING (company_id = get_user_company_id());

-- 6. Reload PostgREST schema cache (REQUIRED after FK changes)
NOTIFY pgrst, 'reload schema';

-- 7. Verification
SELECT 'MIGRATION APPLIED SUCCESSFULLY' as status;
```

## Rules
- Always use `IF NOT EXISTS` / `EXCEPTION WHEN duplicate_*` for idempotency
- Always include `company_id` with FK to `companies(id)` for multi-tenant tables
- Always enable RLS on new tables
- Always include `NOTIFY pgrst, 'reload schema'` when adding FK constraints
- File naming: `supabase/migrations/YYYYMMDD_description.sql`
- Include verification SELECT at the end
- Use `get_user_company_id()` in RLS policies (not raw auth.uid() for company data)
