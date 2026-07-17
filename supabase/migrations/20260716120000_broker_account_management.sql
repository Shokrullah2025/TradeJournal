-- Migration: per-account broker connection management
--
-- The new Broker Hub connect flow (Plaid-style wizard) lets a user pick WHICH of
-- their prop-firm accounts to import (evaluation / funded / personal), give each a
-- nickname, and sync each account independently. That needs the trading_accounts
-- row itself to carry the provider account id and per-account sync state — today
-- only broker_tokens holds a single external_account_id per connection.
--
-- Forward-only + additive: all columns nullable or defaulted, existing rows are
-- unaffected. RLS on trading_accounts already scopes every row to auth.uid().

ALTER TABLE public.trading_accounts
  -- Provider-side account id (ProjectX/Tradovate account number). Needed to call
  -- Trade/search for THIS account during sync.
  ADD COLUMN IF NOT EXISTS external_account_id TEXT,
  -- User-chosen display name ("Apex 150K", "Main Funded"). account_name keeps the
  -- provider name; UI prefers nickname when set.
  ADD COLUMN IF NOT EXISTS nickname            TEXT,
  -- Per-account auto-sync toggle (the hub's ON/Disabled switch).
  ADD COLUMN IF NOT EXISTS sync_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  -- Stamped by broker-sync after each successful import; powers "Last sync 2m ago".
  ADD COLUMN IF NOT EXISTS last_synced_at      TIMESTAMPTZ,
  -- Auto-detected prop firm ("Topstep", "Apex", …) shown as the account's badge.
  ADD COLUMN IF NOT EXISTS prop_firm           TEXT;

-- Sync + duplicate-detection lookups are by (user, broker, provider account id).
CREATE INDEX IF NOT EXISTS idx_trading_accounts_external
  ON public.trading_accounts (user_id, broker, external_account_id);

COMMENT ON COLUMN public.trading_accounts.external_account_id IS
  'Provider-side account id (e.g. ProjectX account id). Used by broker-sync to pull fills for this specific account.';
