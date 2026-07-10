-- ============================================================
-- ZalorTrade — Contact inbox threads + aggregated admin notifications
-- Migration: 20260708210946_contact_threads_notifications.sql
--
-- The admin Contact Inbox becomes thread-based: every message a visitor
-- sends from the same email address belongs to one conversation. Opening
-- a thread shows the full history (newest first), and a new message from
-- that sender bumps the thread to the top of the inbox.
--
-- Notifications are aggregated per sender: the contact-submit Edge
-- Function updates one unread 'contact' notification per admin per
-- sender email (incrementing a count in metadata) instead of inserting
-- a new row for every message.
-- ============================================================

-- 1) Allow the new 'contact' notification category. The CHECK constraint
--    was created inline on the column in 020, so it carries the default
--    auto-generated name.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_category_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_category_check
  CHECK (category IN ('broker_sync', 'billing', 'performance', 'security', 'contact'));

-- 2) Thread lookups: all messages for one sender, newest first (used by the
--    thread detail view), and the aggregated-notification lookup in the
--    contact-submit Edge Function.
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email_created
  ON public.contact_submissions (email, created_at DESC);

-- 3) One row per sender email with the latest message and per-thread counts.
--    security_invoker keeps RLS on contact_submissions in force, so only
--    admins (policy from 024) get rows back — everyone else sees nothing.
CREATE OR REPLACE VIEW public.contact_threads
WITH (security_invoker = true) AS
SELECT DISTINCT ON (email)
  email,
  id         AS latest_id,
  name       AS latest_name,
  subject    AS latest_subject,
  message    AS latest_message,
  status     AS latest_status,
  created_at AS last_message_at,
  COUNT(*)                               OVER (PARTITION BY email) AS message_count,
  COUNT(*) FILTER (WHERE status = 'new') OVER (PARTITION BY email) AS new_count
FROM public.contact_submissions
ORDER BY email, created_at DESC;

-- Views created after 004_grants.sql need their own grant (see 022). anon is
-- intentionally not granted — the inbox is admin-only.
GRANT SELECT ON public.contact_threads TO authenticated;

-- 4) Stream submission changes to the client so the sidebar inbox badge and
--    the "New" tab count update live. postgres_changes respects RLS, so only
--    admins receive these events.
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_submissions;
