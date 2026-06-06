-- Migration 013: Add user settings columns to trading_profiles
-- Moves custom strategies, setups, and risk settings out of localStorage
-- into the database so they persist, sync across devices, and are RLS-scoped.

ALTER TABLE public.trading_profiles
  ADD COLUMN IF NOT EXISTS custom_strategies  JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS custom_setups      JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS risk_settings      JSONB NOT NULL DEFAULT '{}';

-- GIN indexes allow fast containment queries on the JSONB arrays
CREATE INDEX IF NOT EXISTS idx_trading_profiles_strategies
  ON public.trading_profiles USING GIN (custom_strategies);

CREATE INDEX IF NOT EXISTS idx_trading_profiles_setups
  ON public.trading_profiles USING GIN (custom_setups);

-- No new RLS policies needed — trading_profiles already has SELECT/INSERT/UPDATE/DELETE
-- own policies in 002_rls_policies.sql. These columns are covered automatically.
