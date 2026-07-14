-- ─────────────────────────────────────────────────────────────────────────
-- Plan usage limits — manual trades / month and saved backtest sessions
-- ─────────────────────────────────────────────────────────────────────────
-- max_trades_per_month already exists (migration 001) but nothing reads it.
-- This migration gives it real values and adds a sibling cap for backtest
-- sessions, both consumed client-side by usePlanLimits() to gate the manual
-- "Add Trade" form and the "New backtest session" flow.
--
-- Convention (matches the original seed): 0 = unlimited.
--
-- Values:
--   • Manual trades / month — Starter 50, Pro & Elite unlimited.
--   • Backtest sessions     — Pro 25, Elite unlimited. Starter is irrelevant
--     here: Backtesting is feature-locked to Pro+ (see the plan_feature_gating
--     migration), so a Starter user never reaches session creation.
--
-- The plan slugs the app resolves against are basic/premium/enterprise
-- (see resolveAudience in src/lib/featureFlags.js). The original 001 seed used
-- 'pro' for the Pro tier, so we update both 'premium' and 'pro' — whichever is
-- absent simply matches zero rows. Forward-only and idempotent.

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS max_backtest_sessions INT NOT NULL DEFAULT 0;

-- Manual trade caps.
UPDATE public.subscription_plans SET max_trades_per_month = 50
  WHERE slug = 'basic';
UPDATE public.subscription_plans SET max_trades_per_month = 0
  WHERE slug IN ('premium', 'pro', 'enterprise');

-- Backtest session caps.
UPDATE public.subscription_plans SET max_backtest_sessions = 25
  WHERE slug IN ('premium', 'pro');
UPDATE public.subscription_plans SET max_backtest_sessions = 0
  WHERE slug IN ('basic', 'enterprise');
