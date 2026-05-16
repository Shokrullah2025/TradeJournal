-- ============================================================
-- Trade Journal Pro — Initial Schema (PostgreSQL / Supabase)
-- Migration: 001_initial_schema.sql
-- Converted from MySQL schema_v2.sql
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- trigram indexes for text search

-- ============================================================
-- SHARED TRIGGER: auto-update updated_at on every UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- USER MANAGEMENT TABLES
-- ============================================================

-- public.users extends auth.users (Supabase Auth owns email/password)
-- This table holds app-specific fields only.
CREATE TABLE public.users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                  TEXT NOT NULL DEFAULT 'user'
                          CHECK (role IN ('user', 'admin', 'moderator')),
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
  failed_login_attempts INT  NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role   ON public.users (role);
CREATE INDEX idx_users_status ON public.users (status);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- HELPER: check if the calling user is an admin
-- Defined here because it references public.users (must exist first)
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Auto-create a public.users row whenever a new Supabase Auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Extended profile information
CREATE TABLE public.user_profiles (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  first_name   VARCHAR(100) NOT NULL DEFAULT '',
  last_name    VARCHAR(100) NOT NULL DEFAULT '',
  display_name VARCHAR(150) NULL,
  phone        VARCHAR(20)  NULL,
  birthday     DATE         NULL,
  bio          TEXT         NULL,
  avatar_url   VARCHAR(500) NULL,
  timezone     VARCHAR(100) NOT NULL DEFAULT 'UTC',
  language     VARCHAR(10)  NOT NULL DEFAULT 'en',
  currency     VARCHAR(3)   NOT NULL DEFAULT 'USD',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX idx_user_profiles_name         ON public.user_profiles (first_name, last_name);
CREATE INDEX idx_user_profiles_display_name ON public.user_profiles (display_name);
-- GIN trigram index replaces MySQL FULLTEXT on bio
CREATE INDEX idx_user_profiles_bio_trgm     ON public.user_profiles USING GIN (bio gin_trgm_ops);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- User addresses
CREATE TABLE public.user_addresses (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  address_type   TEXT        NOT NULL DEFAULT 'home'
                               CHECK (address_type IN ('home', 'business', 'billing', 'shipping')),
  street_address VARCHAR(255) NULL,
  address_line_2 VARCHAR(255) NULL,
  city           VARCHAR(100) NULL,
  state_province VARCHAR(100) NULL,
  postal_code    VARCHAR(20)  NULL,
  country        VARCHAR(100) NULL,
  is_primary     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_addresses_user_type ON public.user_addresses (user_id, address_type);
CREATE INDEX idx_user_addresses_country   ON public.user_addresses (country);
CREATE INDEX idx_user_addresses_primary   ON public.user_addresses (is_primary);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trading profile (trading-specific preferences)
CREATE TABLE public.trading_profiles (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trading_experience TEXT       NOT NULL DEFAULT 'beginner'
                                  CHECK (trading_experience IN ('beginner', 'intermediate', 'advanced', 'expert')),
  risk_tolerance    TEXT        NOT NULL DEFAULT 'moderate'
                                  CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive', 'very_aggressive')),
  preferred_markets JSONB       NULL,
  investment_goals  TEXT        NULL,
  trading_style     TEXT        NULL
                                  CHECK (trading_style IN ('scalping', 'day_trading', 'swing_trading', 'position_trading', 'algorithmic')),
  account_size_range TEXT       NULL
                                  CHECK (account_size_range IN ('0-1k', '1k-10k', '10k-50k', '50k-100k', '100k-500k', '500k+')),
  primary_broker    VARCHAR(100) NULL,
  favorite_instruments JSONB    NULL,
  trading_hours     JSONB       NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX idx_trading_profiles_experience ON public.trading_profiles (trading_experience);
CREATE INDEX idx_trading_profiles_risk       ON public.trading_profiles (risk_tolerance);
CREATE INDEX idx_trading_profiles_style      ON public.trading_profiles (trading_style);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.trading_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRADING DATA TABLES
-- ============================================================

CREATE TABLE public.trading_accounts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_name    VARCHAR(100) NOT NULL,
  broker          VARCHAR(100) NOT NULL,
  account_number  VARCHAR(100) NULL,
  account_type    TEXT        NOT NULL DEFAULT 'demo'
                                CHECK (account_type IN ('demo', 'live', 'paper')),
  base_currency   VARCHAR(3)  NOT NULL DEFAULT 'USD',
  initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trading_accounts_user   ON public.trading_accounts (user_id, account_name);
CREATE INDEX idx_trading_accounts_broker ON public.trading_accounts (broker);
CREATE INDEX idx_trading_accounts_type   ON public.trading_accounts (account_type);
CREATE INDEX idx_trading_accounts_active ON public.trading_accounts (is_active);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.trading_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trades table
-- Note: PostgreSQL handles millions of rows efficiently with proper indexes.
-- Year-range partitioning can be added in a later migration when row count exceeds 50M.
CREATE TABLE public.trades (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id       UUID        NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  external_trade_id VARCHAR(100) NULL,
  instrument       VARCHAR(100) NOT NULL,
  instrument_type  TEXT        NOT NULL
                                CHECK (instrument_type IN ('stock', 'forex', 'future', 'option', 'crypto', 'commodity')),
  direction        TEXT        NOT NULL
                                CHECK (direction IN ('long', 'short')),
  quantity         DECIMAL(15,4) NOT NULL,
  entry_price      DECIMAL(15,6) NOT NULL,
  exit_price       DECIMAL(15,6) NULL,
  stop_loss        DECIMAL(15,6) NULL,
  take_profit      DECIMAL(15,6) NULL,
  entry_date       TIMESTAMPTZ NOT NULL,
  exit_date        TIMESTAMPTZ NULL,
  status           TEXT        NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open', 'closed', 'cancelled')),
  pnl              DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  commission       DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  swap             DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  strategy         VARCHAR(100) NULL,
  setup_type       VARCHAR(100) NULL,
  market_condition VARCHAR(100) NULL,
  notes            TEXT        NULL,
  tags             JSONB       NULL,
  risk_reward_ratio DECIMAL(5,2) NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_user_date      ON public.trades (user_id, entry_date DESC);
CREATE INDEX idx_trades_instrument     ON public.trades (instrument);
CREATE INDEX idx_trades_instrument_type ON public.trades (instrument_type);
CREATE INDEX idx_trades_status         ON public.trades (status);
CREATE INDEX idx_trades_strategy       ON public.trades (strategy);
CREATE INDEX idx_trades_pnl            ON public.trades (pnl);
CREATE INDEX idx_trades_entry_date     ON public.trades (entry_date DESC);
CREATE INDEX idx_trades_exit_date      ON public.trades (exit_date DESC);
CREATE INDEX idx_trades_account        ON public.trades (account_id);
-- GIN trigram index replaces MySQL FULLTEXT on notes
CREATE INDEX idx_trades_notes_trgm     ON public.trades USING GIN (notes gin_trgm_ops);
-- GIN index on tags JSONB for fast tag queries
CREATE INDEX idx_trades_tags           ON public.trades USING GIN (tags);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trade templates (quick-fill presets)
CREATE TABLE public.trade_templates (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  template_name    VARCHAR(100) NOT NULL,
  instrument       VARCHAR(100) NULL,
  instrument_type  TEXT        NULL
                                CHECK (instrument_type IN ('stock', 'forex', 'future', 'option', 'crypto', 'commodity')),
  direction        TEXT        NULL
                                CHECK (direction IN ('long', 'short')),
  quantity         DECIMAL(15,4) NULL,
  stop_loss_pips   DECIMAL(8,2)  NULL,
  take_profit_pips DECIMAL(8,2)  NULL,
  strategy         VARCHAR(100) NULL,
  setup_type       VARCHAR(100) NULL,
  market_condition VARCHAR(100) NULL,
  notes            TEXT        NULL,
  tags             JSONB       NULL,
  is_favorite      BOOLEAN     NOT NULL DEFAULT FALSE,
  usage_count      INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trade_templates_user     ON public.trade_templates (user_id, template_name);
CREATE INDEX idx_trade_templates_favorite ON public.trade_templates (is_favorite);
CREATE INDEX idx_trade_templates_usage    ON public.trade_templates (usage_count DESC);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.trade_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trade images / screenshots
CREATE TABLE public.trade_images (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id   UUID        NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  image_url  VARCHAR(500) NOT NULL,
  image_type TEXT        NOT NULL DEFAULT 'chart'
                           CHECK (image_type IN ('chart', 'analysis', 'other')),
  caption    TEXT        NULL,
  file_size  INT         NULL,
  mime_type  VARCHAR(100) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trade_images_trade ON public.trade_images (trade_id);
CREATE INDEX idx_trade_images_user  ON public.trade_images (user_id);
CREATE INDEX idx_trade_images_type  ON public.trade_images (image_type);

-- ============================================================
-- ANALYTICS AND REPORTING TABLES
-- ============================================================

CREATE TABLE public.daily_performance (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id      UUID        NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  date            DATE        NOT NULL,
  trades_count    INT         NOT NULL DEFAULT 0,
  winning_trades  INT         NOT NULL DEFAULT 0,
  losing_trades   INT         NOT NULL DEFAULT 0,
  gross_profit    DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  gross_loss      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  net_pnl         DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  commission_paid DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  win_rate        DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  profit_factor   DECIMAL(8,4)  NOT NULL DEFAULT 0.00,
  max_drawdown    DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, account_id, date)
);

CREATE INDEX idx_daily_perf_date      ON public.daily_performance (date DESC);
CREATE INDEX idx_daily_perf_user_date ON public.daily_performance (user_id, date DESC);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.daily_performance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.monthly_performance (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id      UUID        NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  year            INT         NOT NULL,
  month           INT         NOT NULL CHECK (month BETWEEN 1 AND 12),
  trades_count    INT         NOT NULL DEFAULT 0,
  winning_trades  INT         NOT NULL DEFAULT 0,
  losing_trades   INT         NOT NULL DEFAULT 0,
  gross_profit    DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  gross_loss      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  net_pnl         DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  commission_paid DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  win_rate        DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  profit_factor   DECIMAL(8,4)  NOT NULL DEFAULT 0.00,
  max_drawdown    DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  sharpe_ratio    DECIMAL(8,4)  NOT NULL DEFAULT 0.00,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, account_id, year, month)
);

CREATE INDEX idx_monthly_perf_year_month ON public.monthly_performance (year, month);
CREATE INDEX idx_monthly_perf_user       ON public.monthly_performance (user_id, year, month);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.monthly_performance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SUBSCRIPTION AND BILLING TABLES
-- ============================================================

CREATE TABLE public.subscription_plans (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(100) NOT NULL,
  slug                VARCHAR(100) NOT NULL UNIQUE,
  description         TEXT        NULL,
  price               DECIMAL(10,2) NOT NULL,
  currency            VARCHAR(3)  NOT NULL DEFAULT 'USD',
  billing_cycle       TEXT        NOT NULL DEFAULT 'monthly'
                                    CHECK (billing_cycle IN ('monthly', 'quarterly', 'annually')),
  features            JSONB       NULL,
  max_trades_per_month INT        NOT NULL DEFAULT 0,
  max_accounts        INT         NOT NULL DEFAULT 1,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order          INT         NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_slug   ON public.subscription_plans (slug);
CREATE INDEX idx_subscription_plans_active ON public.subscription_plans (is_active);
CREATE INDEX idx_subscription_plans_sort   ON public.subscription_plans (sort_order);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.user_subscriptions (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id                UUID        NOT NULL REFERENCES public.subscription_plans(id),
  status                 TEXT        NOT NULL DEFAULT 'active'
                                       CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
  current_period_start   TIMESTAMPTZ NOT NULL,
  current_period_end     TIMESTAMPTZ NOT NULL,
  cancel_at_period_end   BOOLEAN     NOT NULL DEFAULT FALSE,
  cancelled_at           TIMESTAMPTZ NULL,
  trial_start            TIMESTAMPTZ NULL,
  trial_end              TIMESTAMPTZ NULL,
  stripe_subscription_id VARCHAR(100) NULL,
  stripe_customer_id     VARCHAR(100) NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_subs_user_status  ON public.user_subscriptions (user_id, status);
CREATE INDEX idx_user_subs_stripe_sub   ON public.user_subscriptions (stripe_subscription_id);
CREATE INDEX idx_user_subs_stripe_cust  ON public.user_subscriptions (stripe_customer_id);
CREATE INDEX idx_user_subs_period_end   ON public.user_subscriptions (current_period_end);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.payment_methods (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(100) NOT NULL,
  type                     TEXT        NOT NULL DEFAULT 'card'
                                         CHECK (type IN ('card', 'bank_account', 'paypal')),
  last_four                VARCHAR(4)  NULL,
  brand                    VARCHAR(50) NULL,
  exp_month                INT         NULL,
  exp_year                 INT         NULL,
  is_default               BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user          ON public.payment_methods (user_id);
CREATE INDEX idx_payment_methods_stripe_method ON public.payment_methods (stripe_payment_method_id);
CREATE INDEX idx_payment_methods_default       ON public.payment_methods (is_default);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.invoices (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id          UUID        NULL REFERENCES public.user_subscriptions(id),
  invoice_number           VARCHAR(100) NOT NULL UNIQUE,
  status                   TEXT        NOT NULL DEFAULT 'draft'
                                         CHECK (status IN ('draft', 'sent', 'paid', 'failed', 'refunded')),
  amount                   DECIMAL(10,2) NOT NULL,
  currency                 VARCHAR(3)  NOT NULL DEFAULT 'USD',
  tax_amount               DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount             DECIMAL(10,2) NOT NULL,
  due_date                 DATE        NULL,
  paid_at                  TIMESTAMPTZ NULL,
  stripe_invoice_id        VARCHAR(100) NULL,
  stripe_payment_intent_id VARCHAR(100) NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_user_status ON public.invoices (user_id, status);
CREATE INDEX idx_invoices_number      ON public.invoices (invoice_number);
CREATE INDEX idx_invoices_stripe      ON public.invoices (stripe_invoice_id);
CREATE INDEX idx_invoices_due_date    ON public.invoices (due_date);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SYSTEM AND AUDIT TABLES
-- ============================================================

CREATE TABLE public.user_activity_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action     VARCHAR(100) NOT NULL,
  details    JSONB       NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT        NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user_date ON public.user_activity_log (user_id, created_at DESC);
CREATE INDEX idx_activity_log_action    ON public.user_activity_log (action);
CREATE INDEX idx_activity_log_date      ON public.user_activity_log (created_at DESC);

CREATE TABLE public.system_settings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key   VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT        NULL,
  description   TEXT        NULL,
  is_public     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_settings_key    ON public.system_settings (setting_key);
CREATE INDEX idx_system_settings_public ON public.system_settings (is_public);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ANALYTICS RECALCULATION FUNCTION
-- Replaces the MySQL stored procedure CalculateMonthlyPerformance.
-- Called from a Supabase Edge Function (not run in the user request path).
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_monthly_performance(
  p_user_id UUID,
  p_year    INT,
  p_month   INT,
  p_account_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_trades_count  INT;
  v_winning       INT;
  v_losing        INT;
  v_gross_profit  DECIMAL(15,2);
  v_gross_loss    DECIMAL(15,2);
  v_net_pnl       DECIMAL(15,2);
  v_commission    DECIMAL(15,2);
  v_win_rate      DECIMAL(5,2);
  v_profit_factor DECIMAL(8,4);
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE pnl > 0),
    COUNT(*) FILTER (WHERE pnl < 0),
    COALESCE(SUM(pnl) FILTER (WHERE pnl > 0), 0),
    COALESCE(ABS(SUM(pnl) FILTER (WHERE pnl < 0)), 0),
    COALESCE(SUM(pnl), 0),
    COALESCE(SUM(commission), 0)
  INTO
    v_trades_count, v_winning, v_losing,
    v_gross_profit, v_gross_loss, v_net_pnl, v_commission
  FROM public.trades
  WHERE user_id = p_user_id
    AND account_id = p_account_id
    AND EXTRACT(YEAR  FROM entry_date) = p_year
    AND EXTRACT(MONTH FROM entry_date) = p_month
    AND status = 'closed';

  v_win_rate      := CASE WHEN v_trades_count > 0
                          THEN ROUND((v_winning::DECIMAL / v_trades_count) * 100, 2)
                          ELSE 0 END;
  v_profit_factor := CASE WHEN v_gross_loss > 0
                          THEN ROUND(v_gross_profit / v_gross_loss, 4)
                          ELSE 0 END;

  INSERT INTO public.monthly_performance (
    user_id, account_id, year, month,
    trades_count, winning_trades, losing_trades,
    gross_profit, gross_loss, net_pnl, commission_paid,
    win_rate, profit_factor
  ) VALUES (
    p_user_id, p_account_id, p_year, p_month,
    v_trades_count, v_winning, v_losing,
    v_gross_profit, v_gross_loss, v_net_pnl, v_commission,
    v_win_rate, v_profit_factor
  )
  ON CONFLICT (user_id, account_id, year, month) DO UPDATE SET
    trades_count    = EXCLUDED.trades_count,
    winning_trades  = EXCLUDED.winning_trades,
    losing_trades   = EXCLUDED.losing_trades,
    gross_profit    = EXCLUDED.gross_profit,
    gross_loss      = EXCLUDED.gross_loss,
    net_pnl         = EXCLUDED.net_pnl,
    commission_paid = EXCLUDED.commission_paid,
    win_rate        = EXCLUDED.win_rate,
    profit_factor   = EXCLUDED.profit_factor,
    updated_at      = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VIEWS
-- ============================================================

CREATE VIEW public.user_complete_profile AS
SELECT
  u.id,
  au.email,
  au.email_confirmed_at AS email_verified_at,
  au.last_sign_in_at    AS last_login_at,
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
  us.status          AS subscription_status,
  sp.name            AS subscription_plan
FROM public.users u
JOIN auth.users au ON u.id = au.id
LEFT JOIN public.user_profiles    up ON u.id = up.user_id
LEFT JOIN public.trading_profiles tp ON u.id = tp.user_id
LEFT JOIN public.user_subscriptions us
       ON u.id = us.user_id AND us.status = 'active'
LEFT JOIN public.subscription_plans sp ON us.plan_id = sp.id;

CREATE VIEW public.trading_performance_summary AS
SELECT
  t.user_id,
  COUNT(*)                                                  AS total_trades,
  COUNT(*) FILTER (WHERE t.pnl > 0)                        AS winning_trades,
  COUNT(*) FILTER (WHERE t.pnl < 0)                        AS losing_trades,
  COALESCE(SUM(t.pnl), 0)                                  AS net_pnl,
  COALESCE(SUM(t.commission), 0)                           AS total_commission,
  AVG(t.pnl) FILTER (WHERE t.pnl > 0)                     AS avg_win,
  AVG(t.pnl) FILTER (WHERE t.pnl < 0)                     AS avg_loss,
  CASE WHEN COUNT(*) > 0
       THEN ROUND((COUNT(*) FILTER (WHERE t.pnl > 0))::DECIMAL / COUNT(*) * 100, 2)
       ELSE 0 END                                          AS win_rate
FROM public.trades t
WHERE t.status = 'closed'
GROUP BY t.user_id;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    true,
    2097152,  -- 2MB max
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'trade-images',
    'trade-images',
    false,
    5242880,  -- 5MB max
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- INITIAL DATA
-- ============================================================

INSERT INTO public.subscription_plans
  (name, slug, description, price, billing_cycle, features, max_trades_per_month, max_accounts, sort_order)
VALUES
  (
    'Basic', 'basic', 'Perfect for beginners',
    9.99, 'monthly',
    '["Trade logging", "Basic analytics", "Email support"]'::JSONB,
    100, 1, 1
  ),
  (
    'Pro', 'pro', 'For serious traders',
    19.99, 'monthly',
    '["Unlimited trades", "Advanced analytics", "Priority support", "Export features"]'::JSONB,
    0, 3, 2
  ),
  (
    'Enterprise', 'enterprise', 'For trading teams',
    49.99, 'monthly',
    '["Everything in Pro", "Team collaboration", "Custom integrations", "Phone support"]'::JSONB,
    0, 10, 3
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.system_settings (setting_key, setting_value, description, is_public)
VALUES
  ('app_name',             'Trade Journal Pro', 'Application name',                  true),
  ('app_version',          '2.0.0',             'Current application version',        true),
  ('maintenance_mode',     'false',             'Enable maintenance mode',             false),
  ('max_file_upload_size', '5242880',           'Max file upload size in bytes (5MB)', false),
  ('supported_currencies', '["USD","EUR","GBP","JPY","CAD","AUD"]', 'Supported currencies', true)
ON CONFLICT (setting_key) DO NOTHING;
