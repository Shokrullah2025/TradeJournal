-- Enable Supabase Realtime for the billing tables.
--
-- BillingContext already subscribes to postgres_changes on user_subscriptions
-- to live-refresh the billing page, but the table was never added to the
-- supabase_realtime publication, so that channel never fired — the page only
-- updated on a manual reload. Add both billing tables the UI cares about so
-- plan changes and new invoices reflect immediately. RLS still scopes every
-- realtime event to the owning user (user_id = auth.uid()).

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
