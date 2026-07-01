-- ============================================================
-- Trade Journal Pro — Allow users to delete their own notifications
-- Migration: 028_notifications_delete.sql
--
-- The notification center now lets users clear notifications (single
-- row or "delete all"). 020 only added SELECT/UPDATE/INSERT policies
-- and 027 granted the matching table privileges, with DELETE
-- intentionally left out. This migration adds the missing piece:
--   1. A DELETE RLS policy scoped to the owner (auth.uid() = user_id),
--      so a user can only ever delete their own rows.
--   2. The base-table DELETE grant to `authenticated` — Postgres checks
--      table privileges before RLS, so the policy alone is not enough
--      (same lesson as 027).
--
-- anon is not granted (only signed-in users have notifications).
-- Server-side sources use the service_role key and bypass RLS.
-- ============================================================

-- Users can delete their own notifications.
CREATE POLICY "Users delete own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

GRANT DELETE ON public.notifications TO authenticated;
