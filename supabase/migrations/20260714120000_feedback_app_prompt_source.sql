-- ─────────────────────────────────────────────────────────────────────────
-- Feedback — allow the in-app 30-minute prompt as a source
-- ─────────────────────────────────────────────────────────────────────────
-- trial_feedback (migration 025) restricted `source` to the trial-churn
-- prompts: 'tab_prompt', 'logout_prompt', 'manual'. The new "how's it going?"
-- prompt shown after 30 minutes of app usage writes to the same table (one
-- feedback row per user, rating + optional comment) and needs its own source
-- value so an admin can tell app feedback apart from churn feedback.
--
-- Widening a CHECK is forward-only and safe: no existing row is invalidated.

ALTER TABLE public.trial_feedback
  DROP CONSTRAINT IF EXISTS trial_feedback_source_check;

ALTER TABLE public.trial_feedback
  ADD CONSTRAINT trial_feedback_source_check
  CHECK (source IN ('tab_prompt', 'logout_prompt', 'manual', 'app_prompt'));
