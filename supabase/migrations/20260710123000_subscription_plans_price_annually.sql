-- Stores the annual display amount alongside the monthly `price`. Until now only
-- the monthly figure lived in the DB and the annual number was hardcoded in the
-- frontend; this lets the admin Pricing tool be the single source of truth for
-- both cycles so customer-facing prices update when an admin changes them.
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS price_annually NUMERIC;
