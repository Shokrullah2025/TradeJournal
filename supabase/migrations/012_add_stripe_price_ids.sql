-- Add Stripe price IDs to subscription_plans so Edge Functions can look up
-- the correct Stripe priceId for each plan+billing_cycle combination.
-- After running this migration, populate stripe_price_id_monthly and
-- stripe_price_id_annually from your Stripe Dashboard product prices.

ALTER TABLE public.subscription_plans
  ADD COLUMN stripe_price_id_monthly  VARCHAR(100) NULL,
  ADD COLUMN stripe_price_id_annually VARCHAR(100) NULL;

CREATE INDEX idx_sub_plans_stripe_price_monthly
  ON public.subscription_plans (stripe_price_id_monthly);
CREATE INDEX idx_sub_plans_stripe_price_annually
  ON public.subscription_plans (stripe_price_id_annually);

-- Add UNIQUE constraints on Stripe ID columns to enable idempotent upserts
-- in the stripe-webhook Edge Function without extra round-trips.

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_stripe_invoice_id_unique
  UNIQUE (stripe_invoice_id);

ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_stripe_method_unique
  UNIQUE (stripe_payment_method_id);

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_stripe_sub_unique
  UNIQUE (stripe_subscription_id);
