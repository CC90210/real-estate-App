# Pre-Deploy Checklist

Before pushing to main (auto-deploys to Vercel):

1. **Build check:** `npm run build` passes with zero errors
2. **Lint check:** `npm run lint` passes
3. **Type check:** No TypeScript errors
4. **Migration check:** All new SQL migrations provided to user for manual apply
5. **Env vars check:** Any new env vars documented and flagged for Vercel Dashboard
6. **Security check:** No credentials in committed code, CSP updated if new external domains
7. **Schema sync:** Every `from('table')` call references a real table, every `.select('*, join:fk()')` has FK constraint
