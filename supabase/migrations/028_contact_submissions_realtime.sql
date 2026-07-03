-- Migration: enable realtime for contact_submissions (admin inbox live badge)
-- The admin sidebar shows a single live "unread contact messages" badge, and the
-- inbox list reflects new arrivals/triage without a manual refresh. Realtime
-- honors RLS, so only admins (contact_submissions_select_admin policy, migration
-- 024) receive these change events — anon/non-admin clients get nothing.
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_submissions;
