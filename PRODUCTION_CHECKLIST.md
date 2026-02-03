# PropFlow Production Deployment Checklist

## Pre-Deployment

### Database
- [ ] Run `supabase/MASTER_SETUP.sql` in Supabase SQL Editor
- [ ] Verify all RLS policies are active
- [ ] Check that `get_user_company_id()` function exists

### Environment Variables (Vercel)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

### Company Setup (After First Login)
- [ ] Go to Settings → Branding & UI
- [ ] Enter Company Name
- [ ] Enter Business Phone
- [ ] Enter Business Email
- [ ] Enter Business Address
- [ ] (Optional) Enter Logo URL
- [ ] Click "Save Company Branding"

---

## Feature Verification

### Authentication
- [ ] User can sign up with email/password
- [ ] User can log in
- [ ] User can reset password
- [ ] User profile is created automatically

### Dashboard
- [ ] Stats display correctly (or show 0 for new accounts)
- [ ] Onboarding checklist shows
- [ ] Quick launch buttons work

### Properties
- [ ] Can create new property
- [ ] Can view property list
- [ ] Can filter and search
- [ ] Can delete property
- [ ] Bulk import works

### Applications
- [ ] Can create new application
- [ ] Can view application details
- [ ] Status changes work (Approve/Deny)
- [ ] Application links to property

### Documents
- [ ] Document generator shows company branding fields
- [ ] Can generate Property Summary
- [ ] Can generate Lease Proposal
- [ ] Document viewer shows company header
- [ ] Print/PDF hides sidebar
- [ ] Document history is clickable

### Invoices
- [ ] Can create new invoice
- [ ] Invoice shows company branding
- [ ] Can mark as Sent/Paid
- [ ] Can print invoice

### Showings
- [ ] Calendar displays correctly
- [ ] Can schedule new showing
- [ ] Events show on calendar

### Settings
- [ ] Profile tab works
- [ ] Security tab (password change) works
- [ ] Notifications toggle works
- [ ] Branding saves to company

### Team (if Admin)
- [ ] Can view team members
- [ ] Can generate invite links
- [ ] Invited users join correct company

---

## Mobile Verification
- [ ] Dashboard loads on mobile
- [ ] Bottom navigation appears
- [ ] Hamburger menu opens sidebar
- [ ] All pages are scrollable
- [ ] Print layout works correctly

---

## Performance
- [ ] Initial page load < 3 seconds
- [ ] No React hydration errors
- [ ] No 500 errors in Vercel logs

---

## Security
- [ ] Logged out users redirect to /login
- [ ] Users only see their company's data
- [ ] API routes return 401 for unauthenticated requests

---

## Post-Deployment
- [ ] Monitor Vercel analytics for errors
- [ ] Check Supabase logs for failed queries
- [ ] Test a complete user flow (signup → property → application → document)
