-- ============================================================
-- Trade Journal Pro — Restore SELECT grants on recreated views
-- Migration: 022_fix_view_grants.sql
--
-- Bug: admins hit "permission denied for view user_complete_profile"
-- when loading the user list in the admin dashboard.
--
-- Root cause: 004_grants.sql granted SELECT on ALL TABLES (views
-- included) to `authenticated`, but that is a one-time grant covering
-- only objects that existed when it ran — it does not apply to objects
-- created later. 007_fix_security_advisor_issues.sql then ran
-- DROP VIEW + CREATE VIEW on user_complete_profile and
-- trading_performance_summary. Dropping a view destroys its grants, and
-- the recreated views (created after 004) never received a fresh GRANT,
-- so `authenticated` has no SELECT privilege on them. This surfaces as a
-- privilege error ("permission denied for view"), distinct from RLS
-- (which would silently return zero rows).
--
-- Fix: explicitly grant SELECT on both views to `authenticated`. Access
-- remains correctly scoped — both views are security_invoker = true, so
-- RLS on the underlying tables still applies (a regular user sees only
-- their own row via `user_id = auth.uid()`; admins see all via
-- is_admin()). anon is intentionally not granted: it has no legitimate
-- read of these views and granting it would re-open the exposure that
-- 007 closed.
-- ============================================================

GRANT SELECT ON public.user_complete_profile      TO authenticated;
GRANT SELECT ON public.trading_performance_summary TO authenticated;
