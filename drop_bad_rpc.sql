-- This script perfectly safely drops the `get_enhanced_dashboard_stats` RPC that is returning an incompatible data shape.
-- By dropping this RPC, the frontend `useStats` hook will safely FALLBACK to standard manual Postgres table querying.
-- The fallback is correctly wired up by the previous engineer to query `invoices` for `monthlyRevenue`, `properties` for counts, and `leases` for `monthlyRent`.
DROP FUNCTION IF EXISTS get_enhanced_dashboard_stats(uuid, uuid, boolean);
DROP FUNCTION IF EXISTS get_enhanced_dashboard_stats(uuid);