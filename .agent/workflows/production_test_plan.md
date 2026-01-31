---
description: Comprehensive verification plan for PropFlow Production Build
---

# PropFlow Production Verification Protocol

Follow this checklist to validate the "Closed-Loop" integration and User Experience.

## 1. System Identity & Persistence
**Objective**: Verify that user settings are saved significantly to the database.

1. Navigate to `/settings`.
2. Open **Branding & UI**.
3. Change **Workspace Accent** to "Emerald" (or any non-default).
4. Reload the page.
   - [ ] **Pass**: Accent color remains "Emerald".
5. Toggle **Appearance Mode** to "Dynamic Light".
   - [ ] **Pass**: Selection persists after reload.

## 2. "Closed-Loop" Data Integrity
**Objective**: Ensure actions in the UI reflect immediately and accurately in Supabase.

### Property Management
1. Navigate to **Properties** -> **New Property**.
2. Create a property: "123 Test Blvd".
3. **Check**: Go to Supabase Dashboard -> Table `properties`.
   - [ ] **Pass**: "123 Test Blvd" exists.
4. Delete "123 Test Blvd" from the app UI.
   - [ ] **Pass**: Property vanishes instantly from UI.
   - [ ] **Pass**: Property is removed from Supabase `properties` table.

### Application Lifecycle
1. Navigate to **Applications**.
2. Select an application.
3. Click "Document Designer".
4. Ensure the **Applicant** dropdown is populated and selectable.
   - [ ] **Pass**: Dropdown lists applicant name.
5. Generate a "Lease Proposal".
   - [ ] **Pass**: Proposal is generated with the "Vibrant" styling (solid colors, not washed out).

### Application Deletion (Crucial)
1. **Create** a test application (or use an existing one like "Emma Thompson").
2. **Delete** it via the dropdown menu -> "Delete Permanently".
3. **Verify UI**: It should disappear immediately from the list.
4. **Verify Database**: Check Supabase `applications` table. The row must be gone.
   - *Note*: If deletion fails, ensure you have run the RLS policies SQL script.

## 3. Visual Quality Assurance
**Objective**: Confirm UI polish and responsiveness.

1. Open **Document Generator** on Mobile (or resize browser width < 500px).
2. [ ] **Pass**: Form inputs are full width and easy to tap.
3. [ ] **Pass**: Document Type cards stack vertically and look "premium" (solid backgrounds).

## 4. AI Intelligence
**Objective**: Verify Gemini Context.

1. Click the **AI Chat** (bottom right).
2. Ask: *"What is the rent for 123 Test Blvd?"* (assuming it exists).
3. [ ] **Pass**: AI responds with the correct price from your database.

---
**Troubleshooting**
- If Settings don't save: Verify you ran the `src/lib/supabase/settings_migration.sql` script in Supabase SQL Editor.
- If Applicants don't show: Ensure the application status is not `archived` or similar filtering.
