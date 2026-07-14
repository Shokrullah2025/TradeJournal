-- Enable Supabase Realtime for payment_methods.
--
-- The card a user adds at checkout is not written by the browser — the
-- stripe-webhook Edge Function writes it on `payment_method.attached`, moments
-- after the client-side confirmation returns. BillingContext already refetches
-- on realtime events for user_subscriptions and invoices (migration
-- 20260712050000), but payment_methods was never published, so nothing told the
-- page the row had arrived: a user who had just typed their card in saw an
-- empty "No payment method on file" until they reloaded or signed out and back
-- in.
--
-- RLS still scopes every realtime event to the owning user (user_id =
-- auth.uid()); publishing a table does not widen who can read it.
--
-- REPLICA IDENTITY FULL so DELETE payloads carry the old row's user_id — the
-- client's channel filters on `user_id=eq.<id>`, and without it a delete event
-- ships only the primary key and is dropped by the filter (removing a card
-- would then leave it on screen, which is the same bug in reverse).
--
-- ALTER PUBLICATION ... ADD TABLE has no IF NOT EXISTS and errors 42710 if the
-- table is already published, so the add is guarded — migrations must be
-- re-runnable.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'payment_methods'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_methods;
  END IF;
END $$;

ALTER TABLE public.payment_methods REPLICA IDENTITY FULL;

-- Same treatment for user_subscriptions, which is already published but ships
-- realtime payloads with only the primary key in `old`. FeatureFlagContext now
-- listens for plan changes to re-resolve entitlement live (Starter → Pro must
-- unlock the Pro pages without a reload), and it has to tell a plan change apart
-- from any other write to the row — otherwise every routine webhook touch would
-- fire a full entitlement refresh and flash the "Updating your plan…" overlay.
-- REPLICA IDENTITY FULL makes payload.old carry the previous plan_id/status.
ALTER TABLE public.user_subscriptions REPLICA IDENTITY FULL;
