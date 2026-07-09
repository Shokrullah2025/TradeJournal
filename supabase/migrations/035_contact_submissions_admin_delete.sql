-- ============================================================
-- Trade Journal Pro — Let admins delete contact submissions
-- Migration: 035_contact_submissions_admin_delete.sql
--
-- The admin Contact Inbox gains row checkboxes with a bulk delete
-- action. 024 added admin SELECT/UPDATE policies and 026 granted
-- SELECT, UPDATE to `authenticated`, but neither covered DELETE, so
-- a delete from the UI would silently remove zero rows (RLS) — or be
-- rejected outright by the missing table grant (42501).
--
-- Same pattern as 024/026: base GRANT to `authenticated`, with RLS
-- admitting only admins via public.is_admin() (migration 005).
-- Non-admin authenticated users still cannot delete anything, and
-- anon has no access at all.
-- ============================================================

CREATE POLICY "contact_submissions_delete_admin"
  ON public.contact_submissions
  FOR DELETE
  USING (public.is_admin());

GRANT DELETE ON public.contact_submissions TO authenticated;
