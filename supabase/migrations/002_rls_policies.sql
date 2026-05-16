-- ============================================================
-- Trade Journal Pro — Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- Every table that holds user data is locked to auth.uid().
-- Admins bypass policies via is_admin() helper.
-- ============================================================

-- ============================================================
-- public.users
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Insert is handled by the on_auth_user_created trigger (SECURITY DEFINER).
-- No direct INSERT policy needed for regular users.
CREATE POLICY "users_insert_admin"
  ON public.users FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "users_delete_admin"
  ON public.users FOR DELETE
  USING (is_admin());

-- ============================================================
-- public.user_profiles
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select_own"
  ON public.user_profiles FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "user_profiles_insert_own"
  ON public.user_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_profiles_update_own"
  ON public.user_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_profiles_delete_own"
  ON public.user_profiles FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- public.user_addresses
-- ============================================================
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_addresses_select_own"
  ON public.user_addresses FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "user_addresses_insert_own"
  ON public.user_addresses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_addresses_update_own"
  ON public.user_addresses FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_addresses_delete_own"
  ON public.user_addresses FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- public.trading_profiles
-- ============================================================
ALTER TABLE public.trading_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trading_profiles_select_own"
  ON public.trading_profiles FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "trading_profiles_insert_own"
  ON public.trading_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trading_profiles_update_own"
  ON public.trading_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trading_profiles_delete_own"
  ON public.trading_profiles FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- public.trading_accounts
-- ============================================================
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trading_accounts_select_own"
  ON public.trading_accounts FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "trading_accounts_insert_own"
  ON public.trading_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trading_accounts_update_own"
  ON public.trading_accounts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trading_accounts_delete_own"
  ON public.trading_accounts FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- public.trades
-- ============================================================
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trades_select_own"
  ON public.trades FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "trades_insert_own"
  ON public.trades FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trades_update_own"
  ON public.trades FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trades_delete_own"
  ON public.trades FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- public.trade_templates
-- ============================================================
ALTER TABLE public.trade_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trade_templates_select_own"
  ON public.trade_templates FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "trade_templates_insert_own"
  ON public.trade_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trade_templates_update_own"
  ON public.trade_templates FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trade_templates_delete_own"
  ON public.trade_templates FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- public.trade_images
-- ============================================================
ALTER TABLE public.trade_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trade_images_select_own"
  ON public.trade_images FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "trade_images_insert_own"
  ON public.trade_images FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trade_images_delete_own"
  ON public.trade_images FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- public.daily_performance
-- ============================================================
ALTER TABLE public.daily_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_performance_select_own"
  ON public.daily_performance FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- Analytics rows are written by the recalculate function (SECURITY DEFINER),
-- not directly by users. Still add a policy so admins can insert manually.
CREATE POLICY "daily_performance_insert_admin"
  ON public.daily_performance FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "daily_performance_update_admin"
  ON public.daily_performance FOR UPDATE
  USING (is_admin());

-- ============================================================
-- public.monthly_performance
-- ============================================================
ALTER TABLE public.monthly_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_performance_select_own"
  ON public.monthly_performance FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "monthly_performance_insert_admin"
  ON public.monthly_performance FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "monthly_performance_update_admin"
  ON public.monthly_performance FOR UPDATE
  USING (is_admin());

-- ============================================================
-- public.subscription_plans (public read, admin write)
-- ============================================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_plans_select_all"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "subscription_plans_write_admin"
  ON public.subscription_plans FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- public.user_subscriptions
-- ============================================================
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_subscriptions_select_own"
  ON public.user_subscriptions FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- Subscriptions are created/updated by Stripe Edge Function (SECURITY DEFINER).
-- No direct user insert/update allowed.
CREATE POLICY "user_subscriptions_write_admin"
  ON public.user_subscriptions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- public.payment_methods
-- ============================================================
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_select_own"
  ON public.payment_methods FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "payment_methods_insert_own"
  ON public.payment_methods FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_methods_update_own"
  ON public.payment_methods FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_methods_delete_own"
  ON public.payment_methods FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- public.invoices (read-only for users, write via Edge Function)
-- ============================================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select_own"
  ON public.invoices FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "invoices_write_admin"
  ON public.invoices FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- public.user_activity_log (append-only for users)
-- ============================================================
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_activity_log_select_own"
  ON public.user_activity_log FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "user_activity_log_insert_own"
  ON public.user_activity_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users cannot update or delete their own activity logs (audit integrity).
CREATE POLICY "user_activity_log_delete_admin"
  ON public.user_activity_log FOR DELETE
  USING (is_admin());

-- ============================================================
-- public.system_settings (public settings readable by all)
-- ============================================================
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_settings_select_public"
  ON public.system_settings FOR SELECT
  USING (is_public = true OR is_admin());

CREATE POLICY "system_settings_write_admin"
  ON public.system_settings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- STORAGE RLS POLICIES — set up via Supabase Dashboard
-- Storage > Policies > New Policy (run 003_storage_policies.sql separately)
-- ============================================================
