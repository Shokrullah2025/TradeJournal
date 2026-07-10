-- ============================================================
-- ZalorTrade — Persistent notification de-duplication keys
-- Migration: 20260709150000_notification_dedup.sql
--
-- Performance milestones ("25 trades logged 🎉") must fire exactly once
-- per user, ever. 020's approach checked the notifications table for an
-- existing row with the same metadata.key, but that guard disappears the
-- moment the user *deletes* the notification — so the milestone re-fired
-- on the next load, every day. This is the confirmed bug behind the
-- repeating "you saved N records" notification.
--
-- This table records the fact that a milestone was awarded, independently
-- of whether its notification still exists in the bell. The (user_id,
-- dedup_key) primary key makes the award atomic and idempotent across
-- tabs and devices: the client INSERTs the key and treats a unique
-- violation as "already awarded". Deleting the notification never touches
-- this table, so a milestone never re-notifies.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_dedup (
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  dedup_key  TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, dedup_key)
);

ALTER TABLE public.notification_dedup ENABLE ROW LEVEL SECURITY;

-- Users can only see and create their own dedup keys.
CREATE POLICY "Users read own notification dedup"
  ON public.notification_dedup
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own notification dedup"
  ON public.notification_dedup
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Base grants (this project grants explicitly — see 026/027's notes).
-- No DELETE for authenticated: the guard is permanent by design.
GRANT SELECT, INSERT ON public.notification_dedup TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.notification_dedup TO service_role;

-- Backfill: seed dedup keys from milestone notifications that already exist so
-- users who currently hold a milestone in their bell don't get a one-time
-- duplicate on their next load. Users who already deleted theirs have no row to
-- read here and will see it once more before it's permanently suppressed.
INSERT INTO public.notification_dedup (user_id, dedup_key)
SELECT DISTINCT user_id, metadata->>'key'
FROM public.notifications
WHERE category = 'performance'
  AND metadata->>'key' IS NOT NULL
ON CONFLICT DO NOTHING;
