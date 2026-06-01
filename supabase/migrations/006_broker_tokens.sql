-- Migration: broker_tokens table
-- Stores OAuth access/refresh tokens server-side so they never touch the browser.
-- Tokens are scoped per user+broker+account_type (one row per connection).

CREATE TABLE IF NOT EXISTS public.broker_tokens (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id    UUID        REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  broker        VARCHAR(50) NOT NULL,
  account_type  TEXT        NOT NULL DEFAULT 'demo'
                              CHECK (account_type IN ('demo', 'live', 'paper')),
  access_token  TEXT        NOT NULL,
  refresh_token TEXT,
  token_type    VARCHAR(20) NOT NULL DEFAULT 'Bearer',
  expires_at    TIMESTAMPTZ,
  scope         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, broker, account_type)
);

CREATE INDEX IF NOT EXISTS idx_broker_tokens_user
  ON public.broker_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_broker_tokens_expiry
  ON public.broker_tokens (expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE public.broker_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read and manage their own tokens.
-- Edge Functions bypass RLS using the service_role key.
CREATE POLICY "Users manage own broker tokens"
  ON public.broker_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION public.set_broker_tokens_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER broker_tokens_updated_at
  BEFORE UPDATE ON public.broker_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_broker_tokens_updated_at();
