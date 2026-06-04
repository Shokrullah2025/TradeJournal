-- Fix three CRITICAL issues flagged by Supabase Security Advisor:
--
-- 1. Exposed Auth Users  — user_complete_profile joined auth.users, leaking
--    email / last_sign_in_at / email_confirmed_at to anon and authenticated
--    roles via PostgREST.  Resolved by removing the auth.users join entirely.
--    Auth fields (email, email_verified_at, last_login_at) must be read
--    client-side from supabase.auth.getUser(), which is already scoped to the
--    current session.
--
-- 2. Security Definer View (user_complete_profile) — views run as the owner
--    (postgres superuser) by default, bypassing RLS on the underlying tables.
--    Resolved by adding WITH (security_invoker = true).
--
-- 3. Security Definer View (trading_performance_summary) — same root cause.
--    Resolved by adding WITH (security_invoker = true).

-- ----------------------------------------------------------------
-- user_complete_profile
-- ----------------------------------------------------------------
DROP VIEW IF EXISTS public.user_complete_profile;

CREATE VIEW public.user_complete_profile
WITH (security_invoker = true)
AS
SELECT
  u.id,
  u.role,
  u.status,
  u.created_at,
  up.first_name,
  up.last_name,
  up.display_name,
  up.phone,
  up.birthday,
  up.bio,
  up.avatar_url,
  up.timezone,
  up.language,
  up.currency,
  tp.trading_experience,
  tp.risk_tolerance,
  tp.preferred_markets,
  tp.investment_goals,
  tp.trading_style,
  us.status       AS subscription_status,
  sp.name         AS subscription_plan
FROM public.users u
LEFT JOIN public.user_profiles      up ON u.id = up.user_id
LEFT JOIN public.trading_profiles   tp ON u.id = tp.user_id
LEFT JOIN public.user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
LEFT JOIN public.subscription_plans sp ON us.plan_id = sp.id;

-- ----------------------------------------------------------------
-- trading_performance_summary
-- ----------------------------------------------------------------
DROP VIEW IF EXISTS public.trading_performance_summary;

CREATE VIEW public.trading_performance_summary
WITH (security_invoker = true)
AS
SELECT
  t.user_id,
  COUNT(*)                                                     AS total_trades,
  COUNT(*) FILTER (WHERE t.pnl > 0)                           AS winning_trades,
  COUNT(*) FILTER (WHERE t.pnl < 0)                           AS losing_trades,
  COALESCE(SUM(t.pnl), 0)                                     AS net_pnl,
  COALESCE(SUM(t.commission), 0)                              AS total_commission,
  AVG(t.pnl) FILTER (WHERE t.pnl > 0)                        AS avg_win,
  AVG(t.pnl) FILTER (WHERE t.pnl < 0)                        AS avg_loss,
  CASE WHEN COUNT(*) > 0
       THEN ROUND(
              (COUNT(*) FILTER (WHERE t.pnl > 0))::DECIMAL
              / COUNT(*) * 100,
              2
            )
       ELSE 0
  END                                                          AS win_rate
FROM public.trades t
WHERE t.status = 'closed'
GROUP BY t.user_id;
