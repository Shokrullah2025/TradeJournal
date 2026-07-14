-- ─────────────────────────────────────────────────────────────────────────
-- Plan usage limits — server-side enforcement (defense in depth)
-- ─────────────────────────────────────────────────────────────────────────
-- The client already gates the manual "Add Trade" form and "New backtest
-- session" flow (usePlanLimits + PlanLimitModal), but a client check is
-- cosmetic — a crafted request straight to PostgREST bypasses it. These
-- BEFORE INSERT triggers make the caps real at the database layer.
--
-- Because enforcement lives in the DB, the trade cap necessarily counts EVERY
-- trade created in the month (manual, CSV import, broker sync) — that is the
-- point: it can't be sidestepped by switching insert path. The backtest cap
-- counts all saved sessions for the user.
--
-- Resolution mirrors the client (src/lib/featureFlags.js + usePlanLimits):
--   • admin role                         → unlimited
--   • live trial (trialing, trial_end>now) → Pro-level (premium/pro) caps
--   • active plan within period (+grace) → that plan's own caps
--   • anything else (free / expired / lapsed) → FAIL OPEN (return 0/unlimited)
-- Failing open on unresolved entitlement is deliberate: the app's TrialGate
-- already blocks those users, and a false block here could strand a paying or
-- mid-signup user. 0 = unlimited throughout (matches the column convention).
--
-- Forward-only and idempotent (CREATE OR REPLACE + DROP TRIGGER IF EXISTS).

-- Speeds up the monthly count the trade trigger runs on every insert (and the
-- client's countTradesThisMonth). backtest_sessions already has (user_id,
-- created_at) from migration 015.
CREATE INDEX IF NOT EXISTS idx_trades_user_created
  ON public.trades (user_id, created_at);

-- ── Effective cap resolver ──────────────────────────────────────────────────
-- Returns the numeric cap (0 = unlimited) that applies to a user for a given
-- kind ('trades' | 'backtest'). SECURITY DEFINER + row_security off so it can
-- read the user's subscription and plan regardless of the caller's RLS.
CREATE OR REPLACE FUNCTION public.plan_limit_for_user(p_user_id uuid, p_kind text)
  RETURNS integer
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  SET row_security = off
AS $$
DECLARE
  v_role          text;
  v_status        text;
  v_trial_end     timestamptz;
  v_period_end    timestamptz;
  v_plan_trades   int;
  v_plan_backtest int;
  v_grace         interval := interval '3 days'; -- mirrors ENTITLEMENT_GRACE_MS
  v_now           timestamptz := now();
  v_max           int;
BEGIN
  -- Admins are never capped.
  SELECT role INTO v_role FROM public.users WHERE id = p_user_id;
  IF v_role = 'admin' THEN
    RETURN 0;
  END IF;

  -- Most recent live (active or trialing) subscription for this user.
  SELECT us.status, us.trial_end, us.current_period_end,
         sp.max_trades_per_month, sp.max_backtest_sessions
    INTO v_status, v_trial_end, v_period_end,
         v_plan_trades, v_plan_backtest
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trialing')
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- No live entitlement (free) → fail open.
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF v_status = 'trialing' THEN
    -- Expired trial → entitlement is gone → fail open.
    IF v_trial_end IS NULL OR v_trial_end <= v_now THEN
      RETURN 0;
    END IF;
    -- Live trials get Pro-level caps, read from the Pro plan itself
    -- (slug 'premium', or legacy 'pro') rather than the trialed plan row.
    SELECT CASE p_kind
             WHEN 'trades'   THEN max_trades_per_month
             WHEN 'backtest' THEN max_backtest_sessions
           END
      INTO v_max
    FROM public.subscription_plans
    WHERE slug IN ('premium', 'pro')
    ORDER BY sort_order
    LIMIT 1;
    RETURN COALESCE(v_max, 0);
  END IF;

  -- Active paid plan: entitlement lapses `grace` past the period end.
  IF v_period_end IS NOT NULL AND v_period_end + v_grace <= v_now THEN
    RETURN 0;
  END IF;

  v_max := CASE p_kind
             WHEN 'trades'   THEN v_plan_trades
             WHEN 'backtest' THEN v_plan_backtest
           END;
  RETURN COALESCE(v_max, 0);
END;
$$;

-- Internal helper only — the triggers call it as the function owner, so no
-- client needs (or gets) direct EXECUTE.
REVOKE ALL ON FUNCTION public.plan_limit_for_user(uuid, text) FROM PUBLIC;

-- ── Trades: monthly cap ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_trade_month_limit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  SET row_security = off
AS $$
DECLARE
  v_max   int;
  v_count int;
BEGIN
  v_max := public.plan_limit_for_user(NEW.user_id, 'trades');
  IF v_max IS NULL OR v_max <= 0 THEN
    RETURN NEW; -- unlimited / fail open
  END IF;

  SELECT count(*) INTO v_count
  FROM public.trades
  WHERE user_id = NEW.user_id
    AND created_at >= date_trunc('month', now());

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'PLAN_LIMIT_TRADES: monthly trade limit of % reached', v_max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_trade_month_limit ON public.trades;
CREATE TRIGGER trg_enforce_trade_month_limit
  BEFORE INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.enforce_trade_month_limit();

-- ── Backtest sessions: total cap ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_backtest_session_limit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  SET row_security = off
AS $$
DECLARE
  v_max   int;
  v_count int;
BEGIN
  v_max := public.plan_limit_for_user(NEW.user_id, 'backtest');
  IF v_max IS NULL OR v_max <= 0 THEN
    RETURN NEW; -- unlimited / fail open
  END IF;

  SELECT count(*) INTO v_count
  FROM public.backtest_sessions
  WHERE user_id = NEW.user_id;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'PLAN_LIMIT_BACKTEST: saved backtest session limit of % reached', v_max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_backtest_session_limit ON public.backtest_sessions;
CREATE TRIGGER trg_enforce_backtest_session_limit
  BEFORE INSERT ON public.backtest_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_backtest_session_limit();
