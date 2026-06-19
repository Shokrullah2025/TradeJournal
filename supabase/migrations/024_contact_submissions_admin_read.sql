-- Migration: let admins read & triage contact submissions
-- 023 created contact_submissions with RLS enabled and no policies (write-only
-- via the service_role Edge Function). The admin inbox UI needs authenticated
-- admins to read submissions and update their status (new/read/archived/spam).
-- We reuse the existing public.is_admin() helper (see migration 005), matching
-- the admin-access pattern used across the rest of the schema.

-- Admins can read every submission. Non-admins still have no SELECT policy, so
-- they see nothing (and anon access remains fully blocked).
CREATE POLICY "contact_submissions_select_admin"
  ON public.contact_submissions
  FOR SELECT
  USING (public.is_admin());

-- Admins can triage a submission's status (mark read / archive / flag spam).
CREATE POLICY "contact_submissions_update_admin"
  ON public.contact_submissions
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
