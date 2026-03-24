# Deep Diagnostic Prompt

Run a comprehensive diagnostic of PropFlow:

1. **Database Audit**
   - List all tables referenced in code (`from('table_name')`)
   - Verify each exists in Supabase
   - Check FK constraints match PostgREST join queries
   - Verify RLS policies exist on all tables

2. **API Route Audit**
   - Check all 52+ routes for auth validation
   - Verify error handling on each route
   - Check webhook signature verification

3. **Frontend Audit**
   - Verify all dashboard pages load without errors
   - Check loading/error states exist
   - Verify feature gating works per plan tier

4. **Migration Audit**
   - List all migration files
   - Cross-reference with live database schema
   - Identify any unapplied migrations

5. **Security Audit**
   - No hardcoded credentials in source
   - CSP headers cover all external domains used
   - Super admin emails from env vars only
   - Service role key never exposed client-side

6. **E2E Testing**
   - Use Playwright to test all critical user flows
   - Login, property CRUD, application submission, document upload
