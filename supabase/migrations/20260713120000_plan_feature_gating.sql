-- ─────────────────────────────────────────────────────────────────────────
-- Plan feature gating
-- ─────────────────────────────────────────────────────────────────────────
-- Turns the entitlement plumbing into a real paywall. Until now the seeded
-- feature_flags.audiences (migration 021) only denied the internal free/trial
-- audiences, so every paid plan (basic/premium/enterprise) passed every flag —
-- a Starter subscriber got Analytics, Backtest, AI Insights and Broker Sync
-- for free, contradicting what /pricing sells.
--
-- After this migration:
--   • Analytics, Backtest, AI Insights → Pro (premium) and above.
--   • Broker Sync                      → Elite (enterprise) only.
--   • Trials get Pro-level access (ai_insights' old "trial": false is removed).
--   • Risk Calculator, CSV Import, Export Reports, Trade Screenshots unchanged
--     (open to all plans).
--
-- Forward-only and idempotent: plain UPDATEs of an existing JSONB column, no
-- schema change. Uses UPDATE (not INSERT … ON CONFLICT DO NOTHING) so the
-- already-seeded rows actually move.

-- Pro-tier features: deny free + Starter (basic); premium/enterprise pass.
UPDATE public.feature_flags
  SET audiences = '{"free": false, "basic": false}'::JSONB
  WHERE key IN ('advanced_analytics', 'backtesting', 'ai_insights');

-- Broker Sync is Elite-only: deny everyone below enterprise, incl. trial.
UPDATE public.feature_flags
  SET audiences = '{"free": false, "trial": false, "basic": false, "premium": false}'::JSONB
  WHERE key = 'broker_sync';
