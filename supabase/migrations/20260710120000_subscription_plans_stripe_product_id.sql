-- Adds a stripe_product_id to subscription_plans so the admin pricing tool can
-- reuse a single Stripe Product per plan when it creates new Prices. Stripe
-- Prices are immutable, so "changing a price" creates a new Price under the same
-- Product; storing the product id avoids spawning a duplicate product each time.
-- Nullable and backfilled lazily by the edge function on first price change.
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR;
