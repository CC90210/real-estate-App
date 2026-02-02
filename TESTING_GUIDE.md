# PropFlow Multi-Tenant Testing Guide

## 1. Overview
PropFlow is a multi-tenant application. Users belong to a specific **Company** and have a specific **Role**. Data is strictly isolated between companies.

## 2. Roles
- **Admin**: Full access to company settings, team management, and all data.
- **Agent**: Can manage properties, view applications, and areas.
- **Landlord**: Restricted view; only their own properties (if assigned) or limited data.

## 3. How to Test (Step-by-Step)

### Step 1: Create a System Admin (First Company)
1. Sign up a new user at `/login` -> "Sign Up".
2. This first user creates a **New Company** during onboarding (if flow is active) or is assigned one.
   - *Note: In current dev mode, you might need to create a company manually in Supabase `companies` table first, then link the profile.*

### Step 2: Invite Team Members
1. Log in as the Admin.
2. Go to `Settings` -> `Team`.
3. Click "Invite Team Member".
4. Select Role (e.g., Agent).
5. Copy the **Invite Link**.

### Step 3: Test New User (Agent)
1. Open an **Incognito Window** (crucial to avoid session conflicts).
2. Paste the Invite Link.
3. You should see the "Join [Company Name]" page.
4. Sign up as a new user (e.g., `agent@test.com`).
5. Verify you land on the Dashboard and see the *same* company name but *different* permissions (e.g., no "Team" settings if restricted).

### Step 4: Test Data Isolation
1. Create a **Second Company** Admin (e.g., `admin2@other.com`).
2. Log in as Admin 2.
3. Create a Property.
4. Log back in as Admin 1 (or Agent 1).
5. Verify you **DO NOT** see Admin 2's property.

## 4. Troubleshooting
- **Missing Data?** Check your `company_id` in the `profiles` table. If it's null, you won't see any data.
- **"AbortError"?** Refresh the page; this is usually a network glitch or stricter browser policy in dev mode.
- **"Purple Tabs"?** This is a styling artifact; try hard refreshing (Ctrl+F5) to clear cached CSS.

## 5. Automation Testing
- Use the `/automations` tab to set up n8n workflows.
- Webhooks are unique per company.
