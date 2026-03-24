# E2E Testing Skill

Use Playwright MCP to test PropFlow pages on production.

## Test Flow
1. Navigate to https://propflow.pro
2. Login with test credentials
3. Test each dashboard section:
   - /dashboard (stats load, no errors)
   - /properties (list loads, create/edit works)
   - /applications (list loads, screening report upload)
   - /maintenance (requests load with fallback)
   - /documents (upload/download works)
   - /inspections (form and photo upload)
   - /social (post scheduling, Late API)
   - /settings (profile update, company settings)
   - /analytics (charts render)
   - /automations (config page loads)

## What to Check
- No console errors
- No blank screens (loading states show)
- No 400/401/403/500 errors in network tab
- Forms validate input
- File uploads respect size limits
- Navigation between sections works
