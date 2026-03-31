# Agent Mistakes Log

## 2026-03-30 — Social media connection not saving

### Bugs (all in the original social connect/callback routes)

**1. Wrong query param name in connect route**
- File: `src/app/api/social/connect/route.ts`
- Root cause: `getConnectUrl` was called with `redirectUrl` but the Late API `GetConnectUrlData` type requires `redirect_url` (underscore). The OAuth callback URL was never registered with Late.
- Prevention: Always check SDK type definitions before passing arguments.

**2. `listAccounts` called with wrong argument shape in callback route**
- File: `src/app/api/social/callback/route.ts`
- Root cause: `late.accounts.listAccounts({ profileId })` passes profileId at top level. `ListAccountsData` requires `{ query: { profileId } }`. Caused all-accounts fetch with no profile filter, so the newly connected account was never found.
- Prevention: Always read SDK type definitions before calling Late API methods.

## 2026-03-30 — Blank/white pages on dashboard navigation

### Bug 1: `return null` in dashboard layout when `!isAuthenticated`

- File: `src/app/(dashboard)/layout.tsx` line 74
- Root cause: `DashboardContent` returned `null` (completely blank DOM) when `isLoading = false` and `isAuthenticated = false`. The `useEffect` that calls `window.location.href = '/login'` runs AFTER the render, so there is always at least one frame where the page is blank. If the redirect is delayed or the state is transiently false (e.g., token refresh event fires with no session), the page stays blank with no recovery path — the user must manually refresh.
- Fix: Replace `return null` with a spinner + "Redirecting..." message, so the page always shows something while the redirect fires.
- Prevention: Never use `return null` in a layout or top-level component as a guard. Always show a loading/redirect indicator so the page is recoverable.

### Bug 2: `AuthListener` creates a new Supabase client on every render

- File: `src/app/providers.tsx` line 68
- Root cause: `const supabase = createClient()` was called directly in the function body (no `useMemo` or `useRef`). Since `supabase` was in the `useEffect` dependency array `[router, supabase]`, and `supabase` was a new object reference on every render, the effect re-subscribed to `onAuthStateChange` on every render of `AuthListener`. This created multiple concurrent auth subscriptions.
- Fix: Changed to `const supabase = useState(() => createClient())[0]` so the client is created exactly once per component mount.
- Prevention: Always stabilize external client instances (Supabase, third-party SDKs) with `useMemo`, `useRef`, or `useState(init)` before using them in `useEffect` dependency arrays.

**3. Wrong field names when reading account data from Late API**
- File: `src/app/api/social/callback/route.ts`
- Root cause: Code used `account.name` (nonexistent) instead of `account.displayName`, and `account.avatar || account.image` (both nonexistent on SocialAccount type).
- Prevention: Check `SocialAccount` type in `node_modules/@getlatedev/node/dist/index.d.ts` before mapping fields.

## 2026-03-30 — Full social audit (3 code bugs fixed + 1 schema migration added)

### Bug 1 (CRITICAL): `mediaUrls` is not a Late API field — media silently ignored
- Files: `src/app/api/social/post/route.ts` line 71, `src/app/api/social/schedule/route.ts` line 72
- Root cause: Both routes set `postPayload.mediaUrls = [...]`. The Late SDK `CreatePostData` type requires `mediaItems: Array<{ type?, url? }>`. The field name `mediaUrls` does not exist in the Late API schema.
- Fix: Changed to `postPayload.mediaItems = mediaUrls.map((url) => ({ url }))` in both routes.
- Prevention: Always verify payload field names against SDK type definitions before writing to `postPayload`.

### Bug 2 (HIGH): `schedule/route.ts` used wrong ID type for `platformAccountIds`
- File: `src/app/api/social/schedule/route.ts`
- Root cause: Route queried `.in('late_account_id', platformAccountIds)` but the social page always provides Supabase row UUIDs. Authorization always returned 403 and the wrong IDs would go to Late even if it passed.
- Fix: Changed to `.in('id', platformAccountIds)` then mapped `.map(acc => ({ accountId: acc.late_account_id }))` for the Late payload.
- Prevention: Clarify in comments what ID type `platformAccountIds` contains. Both post/schedule routes must agree.

### Bug 3 (HIGH): `schedule/route.ts` crashed on `post._id` without null guard
- File: `src/app/api/social/schedule/route.ts` line 79
- Root cause: `return NextResponse.json({ postId: post._id })` — if `post` is undefined the TypeError crashes the request.
- Fix: Added `const postId = post?._id || post?.id || null` before the return.
- Prevention: Always use optional chaining when reading from external API responses.

### Bug 4 (HIGH): Global unique constraint on `social_accounts.late_account_id`
- File: `supabase/migrations/20260330_social_tables.sql` line 28-31
- Root cause: `UNIQUE (late_account_id)` is global. If Late reuses an account ID after deletion/reconnect across profiles, the callback INSERT fails with 23505.
- Fix: New migration `20260330_fix_social_accounts_unique.sql` drops global constraint, adds `UNIQUE (company_id, late_account_id)`.
- Prevention: Never enforce uniqueness on third-party IDs without company scoping.
