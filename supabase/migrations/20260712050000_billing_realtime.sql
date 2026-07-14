-- Enable Supabase Realtime for the billing tables.
--
-- BillingContext already subscribes to postgres_changes on user_subscriptions
-- to live-refresh the billing page, but the table was never added to the
-- supabase_realtime publication, so that channel never fired — the page only
-- updated on a manual reload. Add both billing tables the UI cares about so
-- plan changes and new invoices reflect immediately. RLS still scopes every
-- realtime event to the owning user (user_id = auth.uid()).
--
-- ALTER PUBLICATION ... ADD TABLE has no IF NOT EXISTS and errors with 42710
-- if the table is already published (e.g. Realtime was toggled on for it in
-- the Supabase dashboard), so each add is guarded — migrations must be
-- re-runnable.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'invoices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
  END IF;
END $$;
