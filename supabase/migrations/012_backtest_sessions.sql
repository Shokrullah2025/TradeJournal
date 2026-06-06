-- Migration 012: Backtest sessions table
-- Moves backtest history out of localStorage into the database so it persists
-- across sessions, is scoped per user, and is protected by RLS.

CREATE TABLE IF NOT EXISTS public.backtest_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL DEFAULT 'Untitled Backtest',
  parameters  JSONB       NOT NULL DEFAULT '{}',
  results     JSONB       NOT NULL DEFAULT '{}',
  status      TEXT        NOT NULL DEFAULT 'completed'
                CHECK (status IN ('running', 'completed', 'failed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backtest_sessions_user_date
  ON public.backtest_sessions (user_id, created_at DESC);

CREATE OR REPLACE TRIGGER set_backtest_sessions_updated_at
  BEFORE UPDATE ON public.backtest_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.backtest_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backtest_sessions_select_own"
  ON public.backtest_sessions FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "backtest_sessions_insert_own"
  ON public.backtest_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "backtest_sessions_update_own"
  ON public.backtest_sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "backtest_sessions_delete_own"
  ON public.backtest_sessions FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.backtest_sessions TO authenticated;
