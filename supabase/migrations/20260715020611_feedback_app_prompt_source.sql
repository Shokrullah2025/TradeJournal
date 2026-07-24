-- Allow 'app_prompt' as a trial_feedback source.
--
-- Recovered from the remote migration history: this was applied directly to
-- production on 2026-07-15 and never committed, so `supabase db push` reported
-- it as a remote version missing locally. The SQL below is the exact statement
-- recorded in supabase_migrations.schema_migrations for version 20260715020611
-- — re-running it is a no-op on a database that already has it (the constraint
-- is dropped and recreated).

ALTER TABLE public.trial_feedback
  DROP CONSTRAINT IF EXISTS trial_feedback_source_check;

ALTER TABLE public.trial_feedback
  ADD CONSTRAINT trial_feedback_source_check
  CHECK (source IN ('tab_prompt', 'logout_prompt', 'manual', 'app_prompt'));
