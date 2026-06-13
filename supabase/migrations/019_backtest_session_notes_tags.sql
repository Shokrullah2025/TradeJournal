-- Migration 019: Editable note and custom tags on backtest sessions
-- Lets users annotate a finished session from the history modal: a free-form
-- note plus a small set of custom tags. Tags the user creates are also stored
-- in backtest_setup_tags (018) so they can be suggested on other sessions.

ALTER TABLE public.backtest_sessions
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]';
