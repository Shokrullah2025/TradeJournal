-- subscription_plans is public reference data — grant read access to all roles.
-- service_role needs full access for Edge Function queries.
GRANT ALL ON public.subscription_plans TO service_role;
GRANT SELECT ON public.subscription_plans TO anon, authenticated;

CREATE POLICY "subscription_plans_readable_by_all"
  ON public.subscription_plans
  FOR SELECT
  USING (true);
