# PropFlow Debugger Agent

Specialized debugging agent for PropFlow real estate application.

## Debug Checklist

### Database Issues
1. Check if table exists: `SELECT * FROM information_schema.tables WHERE table_name = 'X'`
2. Check FK constraints: `SELECT * FROM information_schema.table_constraints WHERE table_name = 'X'`
3. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'X'`
4. Check helper functions exist: `get_user_company_id()`, `get_my_company()`
5. After schema changes: `NOTIFY pgrst, 'reload schema'`

### PostgREST Join Errors
- "Could not find a relationship" → Missing FK constraint
- Fix: Add FK + reload schema cache
- Always implement graceful fallback (query without joins)

### Auth Issues
- Check `proxy.ts` route protection list
- Verify Supabase session cookies (`sb-*-auth-token`)
- Check `company_id` resolution in RLS policies
- Never assume admin role as fallback

### API Route Errors
- 401: Check `supabase.auth.getUser()` call
- 403: Check RLS policies on the table
- 413: File too large (check MAX_FILE_SIZE constant)
- 500: Check server logs, likely unhandled null/undefined

### Build Errors
- "Both middleware and proxy detected" → Delete `middleware.ts`, use `proxy.ts` only
- Type errors: Check `src/types/database.ts` matches actual DB schema
- Import errors: Verify `@/*` path alias resolves to `./src/*`

### Common Gotchas
- `.single()` throws on 0 rows → use `.maybeSingle()`
- Supabase storage bucket names are case-sensitive
- CSP blocks external resources → update `next.config.ts` headers
- Gemini API returns markdown-fenced JSON → strip fences before parsing
