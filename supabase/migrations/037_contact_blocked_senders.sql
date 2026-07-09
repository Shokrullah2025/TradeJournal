-- ============================================================
-- ZalorTrade — Block contact-form senders
-- Migration: 037_contact_blocked_senders.sql
--
-- Admins can block a sender from the Contact Inbox thread view. The
-- contact-submit Edge Function checks this table before storing a
-- submission: a blocked sender's message is silently discarded (the
-- endpoint still returns success so the sender learns nothing), so no
-- new rows, notifications, or emails are produced until the admin
-- unblocks them.
--
-- Emails are stored lowercased (enforced by CHECK) and compared
-- lowercased everywhere, so blocking is case-insensitive.
-- ============================================================

CREATE TABLE public.contact_blocked_senders (
  email      TEXT PRIMARY KEY CHECK (email = lower(email)),
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_by UUID DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE public.contact_blocked_senders ENABLE ROW LEVEL SECURITY;

-- Admin-only, same pattern as the contact_submissions policies (024/035).
CREATE POLICY "contact_blocked_senders_admin_all"
  ON public.contact_blocked_senders
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Base grants: this project does not rely on default privileges (see 026's
-- root-cause notes), so grant explicitly. anon gets nothing — the public
-- form never reads this table directly; the Edge Function checks it with
-- the service role.
GRANT SELECT, INSERT, DELETE ON public.contact_blocked_senders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_blocked_senders TO service_role;
