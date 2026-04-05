---
description: "Write and verify Supabase RLS policies. Use when adding tables, modifying access, or debugging permission errors."
---
# Supabase RLS for PropFlow

Every table MUST have RLS enabled. No exceptions.

## Pattern
```sql
-- Enable RLS
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

-- Policy: users see only their company's data
CREATE POLICY "company_isolation" ON <table>
  FOR ALL USING (company_id = auth.jwt()->>'company_id');
```

## Verify
```bash
# Check RLS is enabled on all tables
python /c/Users/User/Business-Empire-Agent/scripts/supabase_tool.py query --project propflow \
  "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'"
```

## Rules
- ALL queries scoped by `company_id` — multi-tenant isolation
- Service role key: server-side only (API routes, webhooks)
- Anon key: client-side (auto-scoped by RLS)
- Test every new policy with both owner and non-owner JWTs