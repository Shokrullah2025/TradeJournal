-- ============================================================
-- Trade Journal Pro — Trial & Conversion Infrastructure
-- Migration: 021_trial_and_conversion.sql
--
-- 1. Adds 'trialing' to user_subscriptions.status CHECK so the
--    webhook can write the real Stripe status instead of collapsing
--    it into 'active'.
-- 2. Creates subscription_events — append-only ledger for
--    trial lifecycle events (started, converted, cancelled, expired).
--    Source of truth for conversion-rate analytics.
-- 3. Creates trial_feedback — one feedback record per user,
--    collected after they've explored the product in-app.
-- 4. RLS policies (mirror existing patterns from 002_rls_policies.sql).
-- 5. Explicit role grants (new tables are not covered by the broad
--    GRANT in 004_grants.sql, which only applied to tables existing
--    at that point in time).
-- ============================================================


-- ============================================================
-- 1. Extend user_subscriptions.status to include 'trialing'
-- ============================================================
-- Use a DO block to drop the existing status check constraint regardless
-- of the auto-generated name PostgreSQL assigned when it was created inline.
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT conname INTO v_conname
  FROM   pg_constraint  c
  JOIN   pg_class       t  ON c.conrelid   = t.oid
  JOIN   pg_namespace   n  ON t.relnamespace = n.oid
  WHERE  n.nspname  = 'public'
    AND  t.relname  = 'user_subscriptions'
    AND  c.contype  = 'c'
    AND  c.conname  LIKE '%status%';

  IF v_conname IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.user_subscriptions DROP CONSTRAINT %I',
      v_conname
    );
  END IF;
END;
$$;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_status_check
  CHECK (status IN ('active', 'trialing', 'cancelled', 'expired', 'suspended'));


-- ============================================================
-- 2. subscription_events
-- Append-only lifecycle ledger — written by the stripe-webhook
-- Edge Function (service-role key). Users and app code never
-- INSERT directly.
-- ============================================================
CREATE TABLE public.subscription_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id  UUID        NOT NULL REFERENCES public.user_subscriptions(id) ON DELETE CASCADE,
  event_type       TEXT        NOT NULL
                                 CHECK (event_type IN (
                                   'trial_started',
                                   'trial_converted',
                                   'trial_cancelled',
                                   'trial_expired'
                                 )),
  from_status      TEXT        NULL,
  to_status        TEXT        NULL,
  metadata         JSONB       NULL,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast user timeline lookups
CREATE INDEX idx_sub_events_user_time
  ON public.subscription_events (user_id, occurred_at DESC);

-- Admin conversion-rate queries (GROUP BY event_type over a date range)
CREATE INDEX idx_sub_events_type_time
  ON public.subscription_events (event_type, occurred_at DESC);


-- ============================================================
-- 3. trial_feedback
-- One record per trial user. Written by the browser via the
-- Supabase SDK (anon/authenticated key) after the user explores
-- the product. Admins read all rows for the analytics dashboard
-- and the weekly email digest.
-- ============================================================
CREATE TABLE public.trial_feedback (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  reason      TEXT        NULL
                            CHECK (reason IN (
                              'too_expensive',
                              'missing_features',
                              'found_alternative',
                              'too_complex',
                              'just_evaluating',
                              'other'
                            )),
  comment     TEXT        NULL,
  source      TEXT        NOT NULL DEFAULT 'tab_prompt'
                            CHECK (source IN ('tab_prompt', 'logout_prompt', 'manual')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent a user from submitting feedback more than once
CREATE UNIQUE INDEX idx_trial_feedback_user
  ON public.trial_feedback (user_id);

-- Admin listing (most recent first) and rating distribution queries
CREATE INDEX idx_trial_feedback_created
  ON public.trial_feedback (created_at DESC);

CREATE INDEX idx_trial_feedback_rating
  ON public.trial_feedback (rating, created_at DESC);


-- ============================================================
-- 4. Row Level Security
-- ============================================================

-- ── subscription_events ────────────────────────────────────
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own event history (e.g. billing page timeline).
CREATE POLICY "sub_events_select_own"
  ON public.subscription_events FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- Events are written by the stripe-webhook Edge Function using the
-- service-role key, which bypasses RLS entirely. No user INSERT policy
-- is needed — and deliberately not added so app code cannot forge events.
CREATE POLICY "sub_events_delete_admin"
  ON public.subscription_events FOR DELETE
  USING (is_admin());

-- ── trial_feedback ─────────────────────────────────────────
ALTER TABLE public.trial_feedback ENABLE ROW LEVEL SECURITY;

-- Users read their own feedback (so the UI can suppress the prompt
-- if they've already submitted).
CREATE POLICY "trial_feedback_select_own"
  ON public.trial_feedback FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- Users submit their own feedback. The UNIQUE index on user_id enforces
-- the one-submission-per-user rule at the DB level.
CREATE POLICY "trial_feedback_insert_own"
  ON public.trial_feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Feedback is immutable once submitted (no UPDATE for users).
-- Admins can delete a row if needed (e.g. GDPR erasure).
CREATE POLICY "trial_feedback_delete_admin"
  ON public.trial_feedback FOR DELETE
  USING (is_admin());


-- ============================================================
-- 5. Role grants
-- The broad GRANT in 004_grants.sql covered tables existing at
-- that time. New tables always need an explicit grant.
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_events TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trial_feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trial_feedback TO anon;
