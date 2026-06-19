-- ============================================================
-- Trade Journal Pro — Admin Dashboard support
-- Migration: 021_admin_dashboard.sql
--
-- Adds the two tables the admin dashboard needs that don't yet exist:
--   1. feature_flags        — per-audience feature gating (free / trial /
--                             plan slug / role). Read by every authenticated
--                             client so the app can hide gated features;
--                             written by admins only.
--   2. admin_metrics_daily  — daily operational telemetry (requests, errors,
--                             active users, signups, p95 latency, load) so the
--                             metrics board can chart real history. Populated by
--                             a scheduled Edge Function; the dashboard also
--                             derives live figures from user_activity_log when a
--                             given day has no snapshot yet.
--
-- Forward-only, additive. Re-runnable: policies/triggers are dropped first.
-- ============================================================

-- ============================================================
-- ADMIN UPDATE POLICY ON public.users
-- 002_rls_policies.sql only granted users_update_own (id = auth.uid()), so an
-- admin's UPDATE of another user's row matched no policy and silently affected
-- zero rows — the admin user-management screen reported success while changing
-- nothing. This adds the missing admin path so suspend/activate/role edits
-- actually persist.
-- ============================================================
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin"
  ON public.users FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- FEATURE FLAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(100) NOT NULL UNIQUE,
  name        VARCHAR(150) NOT NULL,
  description TEXT         NULL,
  -- Master kill switch. When false the feature is off for everyone.
  enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
  -- Per-audience overrides. Keys are audience identifiers
  -- ('free','trial','basic','pro','enterprise','admin'); a value of false
  -- hides the feature for that audience even when `enabled` is true. A missing
  -- key means "inherit enabled" (i.e. allowed).
  audiences   JSONB        NOT NULL DEFAULT '{}',
  -- Optional sort order for stable display in the admin UI.
  sort_order  INT          NOT NULL DEFAULT 0,
  updated_by  UUID         NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key  ON public.feature_flags (key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_sort ON public.feature_flags (sort_order);

DROP TRIGGER IF EXISTS set_updated_at ON public.feature_flags;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Every authenticated user can read flags so the client can gate features.
DROP POLICY IF EXISTS "feature_flags_select_all" ON public.feature_flags;
CREATE POLICY "feature_flags_select_all"
  ON public.feature_flags FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins may create / change / delete flags.
DROP POLICY IF EXISTS "feature_flags_write_admin" ON public.feature_flags;
CREATE POLICY "feature_flags_write_admin"
  ON public.feature_flags FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- DAILY OPERATIONAL METRICS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_metrics_daily (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE        NOT NULL UNIQUE,
  total_requests  INT         NOT NULL DEFAULT 0,
  failed_requests INT         NOT NULL DEFAULT 0,
  active_users    INT         NOT NULL DEFAULT 0,
  new_signups     INT         NOT NULL DEFAULT 0,
  trades_logged   INT         NOT NULL DEFAULT 0,
  -- p95 request latency in milliseconds (hot-path budget is 150ms per CLAUDE.md)
  p95_latency_ms  INT         NOT NULL DEFAULT 0,
  -- Average server load as a 0-100 percentage.
  avg_load_pct    DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_metrics_date ON public.admin_metrics_daily (date DESC);

DROP TRIGGER IF EXISTS set_updated_at ON public.admin_metrics_daily;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.admin_metrics_daily
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.admin_metrics_daily ENABLE ROW LEVEL SECURITY;

-- Operational metrics are admin-only.
DROP POLICY IF EXISTS "admin_metrics_select_admin" ON public.admin_metrics_daily;
CREATE POLICY "admin_metrics_select_admin"
  ON public.admin_metrics_daily FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "admin_metrics_write_admin" ON public.admin_metrics_daily;
CREATE POLICY "admin_metrics_write_admin"
  ON public.admin_metrics_daily FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- GRANTS — least privilege. feature_flags: admins write under RLS, so the
-- authenticated role needs write grants (RLS still gates to is_admin()).
-- admin_metrics_daily is admin-read-only from the client; writes come from a
-- scheduled Edge Function via service_role, so authenticated gets SELECT only.
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags       TO authenticated;
GRANT SELECT                         ON public.admin_metrics_daily TO authenticated;
GRANT ALL ON public.feature_flags       TO service_role;
GRANT ALL ON public.admin_metrics_daily TO service_role;

-- ============================================================
-- SEED — the feature catalog the app gates on. Audiences left empty
-- means "allowed for everyone the master switch allows". The trial/free
-- restrictions below are sensible defaults an admin can change in the UI.
-- ============================================================
INSERT INTO public.feature_flags (key, name, description, enabled, audiences, sort_order)
VALUES
  ('backtesting',        'Backtesting',          'Replay historical price action and journal simulated trades.',        TRUE, '{"free": false}'::JSONB,                 1),
  ('broker_sync',        'Broker Sync',          'Automatic trade import via broker OAuth connections.',                 TRUE, '{"free": false, "trial": false}'::JSONB, 2),
  ('csv_import',         'CSV Import',           'Bulk-import trades from a broker CSV export.',                         TRUE, '{}'::JSONB,                              3),
  ('advanced_analytics', 'Advanced Analytics',   'Strategy, instrument, time-of-day and drawdown breakdowns.',           TRUE, '{"free": false}'::JSONB,                 4),
  ('risk_calculator',    'Risk Calculator',      'Position-size and risk/reward planning tool.',                         TRUE, '{}'::JSONB,                              5),
  ('export_reports',     'Export Reports',       'Download analytics and trade history as XLSX.',                        TRUE, '{"free": false}'::JSONB,                 6),
  ('ai_insights',        'AI Insights',          'Pre-market briefing and automated edge insights.',                     TRUE, '{"free": false, "trial": false}'::JSONB, 7),
  ('trade_images',       'Trade Screenshots',    'Attach chart screenshots to journal entries.',                         TRUE, '{}'::JSONB,                              8)
ON CONFLICT (key) DO NOTHING;
