-- Migration 018: Backtest trade history and user-defined setup tags
-- Stores individual closed trades from backtest sessions (batch-saved on session end)
-- and allows users to define their own custom setup tags beyond the presets.

-- ─── backtest_trades ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.backtest_trades (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id    UUID        NOT NULL REFERENCES public.backtest_sessions(id) ON DELETE CASCADE,
  side          TEXT        NOT NULL CHECK (side IN ('buy', 'sell')),
  size          NUMERIC     NOT NULL,
  tick_ratio    NUMERIC,
  entry_price   NUMERIC     NOT NULL,
  exit_price    NUMERIC     NOT NULL,
  stop_loss     NUMERIC,
  take_profit   NUMERIC,
  pnl           NUMERIC     NOT NULL,
  exit_reason   TEXT        CHECK (exit_reason IN ('TP', 'SL', 'Manual')),
  setup_tag     TEXT,
  r_achieved    NUMERIC,
  mae           NUMERIC,
  mfe           NUMERIC,
  balance_after NUMERIC,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-session and per-user lookups
CREATE INDEX idx_backtest_trades_session
  ON public.backtest_trades (session_id, created_at ASC);

CREATE INDEX idx_backtest_trades_user
  ON public.backtest_trades (user_id, created_at DESC);

ALTER TABLE public.backtest_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backtest_trades_select_own"
  ON public.backtest_trades FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "backtest_trades_insert_own"
  ON public.backtest_trades FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "backtest_trades_update_own"
  ON public.backtest_trades FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "backtest_trades_delete_own"
  ON public.backtest_trades FOR DELETE
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.backtest_trades TO authenticated;


-- ─── backtest_setup_tags ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.backtest_setup_tags (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  color      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE INDEX idx_backtest_setup_tags_user
  ON public.backtest_setup_tags (user_id);

ALTER TABLE public.backtest_setup_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backtest_setup_tags_select_own"
  ON public.backtest_setup_tags FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "backtest_setup_tags_insert_own"
  ON public.backtest_setup_tags FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "backtest_setup_tags_delete_own"
  ON public.backtest_setup_tags FOR DELETE
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE
  ON public.backtest_setup_tags TO authenticated;
