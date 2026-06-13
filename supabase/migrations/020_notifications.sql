-- Migration: notifications table
-- Backs the in-app notification center (bell dropdown + history) and the email
-- channel. One row per notification, scoped per user via RLS. Client-side sources
-- (broker sync errors, performance milestones, security logins) insert directly
-- under the INSERT policy; server-side sources (Stripe webhook, notify-email) use
-- the service_role key and bypass RLS.

CREATE TABLE IF NOT EXISTS public.notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category     TEXT        NOT NULL
                             CHECK (category IN ('broker_sync', 'billing', 'performance', 'security')),
  event_type   TEXT        NOT NULL,
  title        TEXT        NOT NULL,
  body         TEXT,
  severity     TEXT        NOT NULL DEFAULT 'info'
                             CHECK (severity IN ('info', 'success', 'warning', 'error')),
  link_to      TEXT,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  read_at      TIMESTAMPTZ,
  email_status TEXT        NOT NULL DEFAULT 'none'
                             CHECK (email_status IN ('none', 'queued', 'sent', 'skipped', 'failed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- List + pagination (newest first per user)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- Fast unread-count lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications.
CREATE POLICY "Users read own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications read.
CREATE POLICY "Users update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Client-side sources insert notifications for themselves only.
CREATE POLICY "Users insert own notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION public.set_notifications_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_notifications_updated_at();

-- Stream inserts/updates to the client (bell badge updates with no refresh).
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
