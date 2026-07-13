-- ─────────────────────────────────────────────────────────────────────────
-- Feature access — server-side enforcement (RLS + Edge Functions)
-- ─────────────────────────────────────────────────────────────────────────
-- Feature gating so far has been client-only (FeatureGate hides the page and
-- shows a fake preview). This adds the backend half so a crafted request can't
-- reach a gated feature's data/endpoint:
--   • Backtest  → RLS on backtest_sessions INSERT (a non-Pro user cannot create
--                 sessions; they keep read access to existing ones — INSERT
--                 gated only).
--   • AI Insights / Broker Sync → the ai-insights / broker-* Edge Functions
--                 call these resolvers and 403 when not entitled.
--   • Analytics → nothing to enforce: it is computed client-side from the
--                 user's own `trades`, which they may already read via the
--                 (un-gated) Trades page. No separate table/endpoint exists.
--
-- The resolvers mirror the client exactly (src/lib/featureFlags.js:
-- resolveAudience + deriveEntitlement + evaluateFlag) so the two layers agree.
-- Forward-only and idempotent (CREATE OR REPLACE).

-- ── Audience resolver ───────────────────────────────────────────────────────
-- The audience a user belongs to RIGHT NOW: admin | trial | basic | premium |
-- enterprise | free. Mirrors resolveAudience + deriveEntitlement, including the
-- grace window and the "entitlement dies with the period even if the webhook
-- never lands" rule. The legacy 'pro' slug maps to the 'premium' audience — a
-- lenient choice that only ever GRANTS access, never wrongly denies a payer at
-- a hard enforcement layer.
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
    IF v_trial_end IS NULL OR v_trial_end <= v_now THEN
      RETURN 'free';                       -- expired trial
    END IF;
    RETURN 'trial';
  END IF;

  -- active: entitlement lapses `grace` past the period end.
  IF v_period_end IS NOT NULL AND v_period_end + v_grace <= v_now THEN
    RETURN 'free';
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

-- ── Core entitlement check (explicit user) ──────────────────────────────────
-- Whether a user may use a feature. Mirrors evaluateFlag: missing flag → open,
-- master kill-switch → closed, explicit per-audience deny → closed, else open.
-- Admins pass everything. Used by the broker Edge Functions (service-role key,
-- so they pass an explicit user id). REVOKE'd from PUBLIC — clients must not be
-- able to probe another user's entitlement.
CREATE OR REPLACE FUNCTION public.feature_enabled_for(p_user_id uuid, p_flag_key text)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  SET row_security = off
AS $$
DECLARE
  v_audience  text;
  v_enabled   boolean;
  v_audiences jsonb;
BEGIN
  v_audience := public.plan_audience_for_user(p_user_id);
  IF v_audience = 'admin' THEN
    RETURN true;
  END IF;

  SELECT enabled, audiences INTO v_enabled, v_audiences
  FROM public.feature_flags
  WHERE key = p_flag_key;

  IF NOT FOUND THEN
    RETURN true;                            -- no flag record → fail open
  END IF;
  IF v_enabled = false THEN
    RETURN false;                           -- master kill-switch
  END IF;
  IF v_audiences ? v_audience THEN
    RETURN (v_audiences ->> v_audience) <> 'false';
  END IF;
  RETURN true;
END;
$$;

-- ── Self entitlement check ──────────────────────────────────────────────────
-- Convenience wrapper that resolves identity from the JWT (auth.uid()). Safe to
-- expose because it can only ever report the CALLER's own entitlement. Used by
-- RLS policies and by user-JWT-scoped Edge Functions (ai-insights). plpgsql (not
-- sql) so it is never inlined into an RLS expression, which would drop the
-- SECURITY DEFINER context (see migration 005).
CREATE OR REPLACE FUNCTION public.has_feature(p_flag_key text)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  SET row_security = off
AS $$
BEGIN
  RETURN public.feature_enabled_for(auth.uid(), p_flag_key);
END;
$$;

-- Least privilege: the audience resolver and the explicit-user check are
-- internal; only the self-scoped wrapper is exposed to end users.
REVOKE ALL ON FUNCTION public.plan_audience_for_user(uuid)      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.feature_enabled_for(uuid, text)   FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feature_enabled_for(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_feature(text)               TO authenticated;

-- ── Backtest: gate session creation at the DB ───────────────────────────────
-- INSERT only — a downgraded user keeps SELECT/UPDATE/DELETE on their existing
-- sessions but cannot create new ones. Admins pass (has_feature → true).
DROP POLICY IF EXISTS "backtest_sessions_insert_own" ON public.backtest_sessions;
CREATE POLICY "backtest_sessions_insert_own"
  ON public.backtest_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.has_feature('backtesting'));
