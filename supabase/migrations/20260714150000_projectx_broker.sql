-- Migration: ProjectX Gateway broker integration
--
-- Futures prop firms (Apex, Topstep, MyFundedFutures, …) provision accounts on a
-- platform/data-feed provider. Tradovate's API excludes prop/eval accounts, so
-- prop-firm users connect through the **ProjectX Gateway API** instead. ProjectX
-- authenticates with a per-user API key (userName + apiKey) which is exchanged for
-- a 24h session JWT. See docs/broker-integrations.md.
--
-- We reuse the existing broker_tokens table (one row per user+broker+account_type)
-- rather than a parallel table. broker_tokens.access_token holds the short-lived
-- ProjectX session JWT; the long-lived apiKey/userName/base_url are added below so
-- broker-sync can silently re-login when the JWT expires.
--
-- Forward-only + additive: all new columns are nullable, so existing Tradovate
-- rows are unaffected.

-- ── 1. broker_tokens: ProjectX credential columns ──────────────────────────────
ALTER TABLE public.broker_tokens
  ADD COLUMN IF NOT EXISTS api_username        TEXT,  -- ProjectX login username
  ADD COLUMN IF NOT EXISTS api_key             TEXT,  -- ProjectX API key (long-lived credential)
  ADD COLUMN IF NOT EXISTS base_url            TEXT,  -- per-firm gateway host, e.g. https://api.topstepx.com
  ADD COLUMN IF NOT EXISTS firm_id             TEXT,  -- which prop firm on the platform, e.g. 'topstep'
  ADD COLUMN IF NOT EXISTS external_account_id TEXT;  -- ProjectX account id, needed for Trade/search on sync

COMMENT ON COLUMN public.broker_tokens.api_key IS
  'Provider API key (ProjectX). Service-role only; protected by RLS like access_token. Never returned to the browser.';

-- ── 2. Rollout kill-switch ─────────────────────────────────────────────────────
-- Seeded DISABLED so ProjectX stays dark in production until credentials are
-- configured and it is verified live. feature_enabled_for() returns false for
-- everyone while enabled=false, EXCEPT admins (who bypass all flags) — so an admin
-- account can test the live flow before flipping this on for everyone.
--   To enable for all:  UPDATE public.feature_flags SET enabled = true WHERE key = 'projectx_broker';
INSERT INTO public.feature_flags (key, name, description, enabled, audiences, sort_order)
VALUES (
  'projectx_broker',
  'ProjectX Broker',
  'ProjectX Gateway API prop-firm integration (API-key connect + trade sync). Rollout kill-switch.',
  FALSE,
  '{}'::JSONB,
  9
)
ON CONFLICT (key) DO NOTHING;
