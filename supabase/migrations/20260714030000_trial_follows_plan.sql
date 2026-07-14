-- ============================================================
-- A trial is a window on a PLAN, not a tier of its own.
--
-- plan_audience_for_user() collapsed every trialing user into a single 'trial'
-- audience and threw away the plan they had actually chosen. Two bugs fell out
-- of that:
--
--   1. Upgrading Starter → Pro mid-trial changed nothing. The row stays
--      status='trialing', so the audience stayed 'trial' and the feature grid
--      kept denying whatever 'trial' was denied — even after a hard refresh.
--   2. The admin Feature Access grid needed a Trial column that silently
--      overrode every plan column. Denying 'trial' locked the feature for
--      trialing users on EVERY plan, including the ones the admin had just
--      granted it to.
--
-- A live trial now resolves to the plan it is a trial of: a trialing Starter is
-- 'basic', a trialing Pro is 'premium'. An EXPIRED trial still resolves to
-- 'free' — the plan slug must not survive the trial ending, or the trial never
-- really ends.
--
-- Mirrors resolveAudience()/deriveEntitlement() in src/lib/featureFlags.js.
-- ============================================================

CREATE OR REPLACE FUNCTION public.plan_audience_for_user(p_user_id uuid)
  RETURNS text
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  SET row_security = off
AS $$
DECLARE
  v_role       text;
  v_status     text;
  v_trial_end  timestamptz;
  v_period_end timestamptz;
  v_slug       text;
  v_grace      interval := interval '3 days'; -- mirrors ENTITLEMENT_GRACE_MS
  v_now        timestamptz := now();
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = p_user_id;
  IF v_role = 'admin' THEN
    RETURN 'admin';
  END IF;

  SELECT us.status, us.trial_end, us.current_period_end, sp.slug
    INTO v_status, v_trial_end, v_period_end, v_slug
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trialing')
  ORDER BY us.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 'free';
  END IF;

  IF v_status = 'trialing' THEN
    -- The trial lives or dies by trial_end; past it, entitlement is gone.
    IF v_trial_end IS NULL OR v_trial_end <= v_now THEN
      RETURN 'free';
    END IF;
    -- Live trial → fall through and resolve the trialed plan's slug below.
  ELSE
    -- active: entitlement lapses `grace` past the period end.
    IF v_period_end IS NOT NULL AND v_period_end + v_grace <= v_now THEN
      RETURN 'free';
    END IF;
  END IF;

  IF v_slug IN ('basic', 'premium', 'enterprise') THEN
    RETURN v_slug;
  END IF;
  IF v_slug = 'pro' THEN
    RETURN 'premium';                       -- legacy slug alias
  END IF;
  RETURN 'free';
END;
$$;

-- Usage caps follow the same rule: a trialing user gets the caps of the plan
-- they are actually trialing, not a hardcoded Pro allowance. Everything else
-- (admin bypass, expired-trial and lapsed-period fail-open, 0 = unlimited) is
-- unchanged from 20260713140000.
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
  ELSE
    -- Active paid plan: entitlement lapses `grace` past the period end.
    IF v_period_end IS NOT NULL AND v_period_end + v_grace <= v_now THEN
      RETURN 0;
    END IF;
  END IF;

  -- Both a live trial and an active plan are now capped by the SAME row — the
  -- plan on the subscription. (This is the only behavioural change: a live
  -- trial used to read the Pro plan's caps regardless of the plan trialed.)
  v_max := CASE p_kind
             WHEN 'trades'   THEN v_plan_trades
             WHEN 'backtest' THEN v_plan_backtest
           END;
  RETURN COALESCE(v_max, 0);
END;
$$;

-- CREATE OR REPLACE keeps the existing ACL, but re-assert it so the function
-- stays trigger-internal even if it is ever recreated from scratch.
REVOKE ALL ON FUNCTION public.plan_limit_for_user(uuid, text) FROM PUBLIC;

-- Drop the now-meaningless 'trial' key from every flag's audience map. Left in
-- place it would keep denying trialing users regardless of their plan, since
-- nothing resolves to the 'trial' audience any more.
UPDATE public.feature_flags
   SET audiences = audiences - 'trial'
 WHERE audiences ? 'trial';
